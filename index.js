// External includes
var express = require('express');
var bodyParser = require('body-parser');
var Q = require("q");

// Local includes
var roa = require("./roa4node.js");
var $u = roa.utils;
var $m = roa.mapUtils;
var $s = roa.schemaUtils;

var mail4elas = require("./mail4elas.js");

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public/'));

var cl = function(x) {
    console.log(x);
};

// createInClause("communities", "community");
// createInClause("persons", "person");
// createInClause("communities", "approved");
var filterReferencedType = function(resourcetype, columnname) {
    return function(value, query) {
        var syntax = function() {
            cl("ignoring parameter [' + resourcetype + '] - syntax error. [" + value + "]");
        };

        if(value) {
            var permalinks = value.split(",");
            var guids = [];
            for(var i=0; i<permalinks.length; i++) {
                if(permalinks[i].indexOf("/" + resourcetype + "/") == 0) {
                    var guid = permalinks[i].substr(resourcetype.length + 2);
                    if(guid.length == 36) {
                        guids.push(guid);
                    } else {
                        syntax();
                        return;
                    }
                } else {
                    syntax();
                    return;
                }
            }
            if(guid.length == 36) {
                query.sql(' and ' + columnname + ' in (').array(guids).sql(') ');
            } else {
                syntax();
                return;
            }
        }
    }
};

var messagesPostedSince = function(value, select) {
    select.sql(' and posted > ').param(value);
};


var validateCommunities = function(req, resp, elasBackend) {
};

var clearPasswordCache = function (db, element) {
    var deferred = Q.defer();
    $u.clearPasswordCache();
    deferred.resolve();
    return deferred.promise;
}

roa.configure(app,
    {
        logsql : true,
        resources : [
            {
                // Base url, maps 1:1 with a table in postgres (same name, except the '/' is removed)
                type: "/persons",
                // Is this resource public ? (I.e.: Can it be read / updated / inserted publicly ?
                public: false,
                /*
                 JSON properties are mapped 1:1 to columns in the postgres table.
                 Every property can also register 3 possible functions:

                 - onupdate : is executed before UPDATE on the table
                 - oninsert : is executed before INSERT into the table
                 - onread : is executed after SELECT from the table

                 All 3 receive 2 parameters :
                 - the key they were registered on.
                 - the javascript element being PUT.

                 All functions are executed in order of listing here.

                 All are allowed to manipulate the element, before it is inserted/updated in the table.
                 */
                map: {
                    firstname: {},
                    lastname: {},
                    street: {},
                    streetnumber: {},
                    streetbus: { onread: $m.removeifnull },
                    zipcode: {},
                    city: {},
                    phone: { onread: $m.removeifnull },
                    email: { onread: $m.removeifnull },
                    balance: {
                        oninsert: $m.value(0),
                        onupdate: $m.remove
                    },
                    mail4elas: {},
                    community: {references: '/communities'}
                },
                secure : [
                    // TODO : Add security. People can only update their own accounts.
                    // Admins can update all accounts in their community/ies.
                    // Superadmins van update all accounts in all communities.
                ],
                // When a PUT operation is executed there are 2 phases of validate.
                // Validation phase 1 is schema validation.
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    firstname: $s.string(1,128),
                    lastname: $s.string(1,128),
                    street: $s.string(1,256),
                    streetnumber: $s.string(1,16),
                    streetbus: $s.string(1,16),
                    zipcode: $s.zipcode,
                    city: $s.string(1,64),
                    phone: $s.phone,
                    email: $s.email,
                    mail4elas: $s.boolean,
                    // balance should not be validated. It can never be PUT ! If PUT, it is ignored. See above.
                    required: ["firstname","lastname","street","streetnumber","zipcode","city", "mail4elas"]
                },
                // Validation phase 2 : an array of functions with validation rules.
                // All functions are executed. If any of them return an error object the PUT operation returns 409.
                // The output is a combination of all error objects returned by the validation rules/
                validate: [
                ],
                // All queries are URLs. Any allowed URL parameter is configured here. A function can be registered.
                // This function receives 2 parameters :
                //  - the value of the request parameter (string)
                //  - An object for adding SQL to the WHERE clause. This object has 2 methods :
                //      * sql() : A method for appending sql.
                //      * param() : A method for appending a parameter to the text sql.
                //      * array() : A method for appending an array of parameters to the sql. (comma-separated)
                //  All these methods can be chained, so a simple fluent interface exists.
                //
                //  All the supplied functions MUST extend the SQL statement with an 'AND' clause.
                // (or not touch the statement, if they want to skip their processing).
                query: {
                    communities: filterReferencedType('communities','community')
                },
                /*
                Hooks for psot-processing can be registered to perform desired things, like clear a cache,
                do further processing, etc..

                 - afterupdate
                 - afterinsert
                 - afterdelete

                These post-processing functions receive 2 arguments:

                 - a 'db' object, that can be used to call roa4node.executeSQL, with a valid SQLbits statement.
                   This object contains 3 things :
                    - client : a pg-connect client object
                    - done : a pg-connect done function
                    - bits : a reference to SQLbits

                 - the element that was just updated / created.

                 These functions must return a Q promise. When this promise resolves, all executed SQL will
                 be commited on the database. When this promise fails, all executed SQL (including the original insert
                 or update triggered by the API call) will be rolled back.
                */
                afterupdate: [
                    clearPasswordCache
                ],
                afterinsert: [],
                afterdelete: [
                    clearPasswordCache
                ]
            },
            {
                type: "/messages",
                public: false,
                map: {
                    person: {references: '/persons'},
                    posted: {
//                        oninsert: $m.now,
                        onupdate: $m.now
                    },
                    type: {},
                    title: {},
                    description: { onread: $m.removeifnull },
                    amount: { onread: $m.removeifnull },
                    unit: { onread: $m.removeifnull },
                    community: {references: "/communities"}
                },
                secure: [
                    // TODO : Add security.
                    // People should only be allowed to update their own messages.
                    // People should only be allowed to create messages in the communities they have access to.
                    // People should only be allowed to delete their own messages.
                    // Admins should be allowed to update all message in their community/ies.
                    // Admins should be allowed to delete all message in their community/ies.
                    // Superadmins should be allowed to create in any community, update and delete all messages in all communities.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    type: "object",
                    properties : {
                        person: $s.permalink("/persons"),
                        type: {
                            type: "string",
                            description: "Is this message offering something, or is it requesting something ?",
                            enum: ["offer","request"]
                        },
                        title: $s.string(1,256),
                        description: $s.string(0,1024),
                        amount: $s.numeric,
                        unit: $s.string(0,32),
                        community: $s.permalink("/communities")
                    },
                    required: ["person","type","title","community"]
                },
                query: {
                    communities: filterReferencedType("communities","community"),
                    postedSince: messagesPostedSince
                }
            },
            {
                type: "/communities",
                public: true, // remove authorisation check.
                map: {
                    name: {},
                    street: {},
                    streetnumber: {},
                    streetbus: { onread: $m.removeifnull },
                    zipcode: {},
                    city: {},
                    // Only allow create/update to set adminpassword, never show on output.
                    adminpassword: { onread: $m.remove },
                    phone: { onread: $m.removeifnull },
                    email: {},
                    facebook: { onread: $m.removeifnull },
                    website: { onread: $m.removeifnull },
                    currencyname: {}
                },
                secure: [
                    // TODO : Add security.
                    // People should only be allowed to register new communities, with a unique name.
                    // Admins should be allowed to update their community/ies.
                    // Superadmins should be allowed to create, delete and update all communities
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    name: $s.string(1,256),
                    street: $s.string(1,256),
                    streetnumber: $s.string(1,16),
                    streetbus: $s.string(1,16),
                    zipcode: $s.zipcode,
                    city: $s.string(1,64),
                    phone: $s.phone,
                    email: $s.email,
                    adminpassword: $s.string(5,64),
                    website: $s.url,
                    facebook: $s.url,
                    currencyname: $s.string(1,32),
                    required: ["name", "street", "streetnumber", "zipcode", "city", "phone", "email", "adminpassword", "currencyname"]
                },
                validate: [ validateCommunities ]
            },
            {
                type: "/transactions",
                public: false,
                map: {
                    transactiontimestamp: {
//                        oninsert: $m.now,
                        onupdate: $m.now
                    },
                    fromperson: {references: '/persons'},
                    toperson: {references: '/persons'},
                    description: {},
                    amount: {}
                },
                secure: [
                    // TODO : Add security.
                    // People should be allowed to create transactions for their community.
                    // Admins should be allowed to create transactions for their community/ies.
                    // Superadmins should be allowed to create transaction in any community.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    transactiontimestamp: $s.timestamp,
                    fromperson: $s.permalink("/persons"),
                    toperson: $s.permalink("/persons"),
                    description: $s.string(1,256),
                    amount: $s.numeric,
                    required: ["fromperson","toperson","description","amount"]
                },
                afterinsert : [
                    function(db, element) {
                        var bits = db.bits;
                        var amount = element.amount;
                        var fromguid = element.fromperson;
                        var toguid = element.toperson;
                        var updatefrom = bits.SQL("UPDATE persons SET balance = (balance - ", bits.$(amount), ") where guid = ", bits.$(fromguid));
                        return $u.executeSQL(db,updatefrom).then(function() {
                            var updateto = bits.SQL("UPDATE persons SET balance = (balance + ", bits.$(amount), ") where guid = ", bits.$(toguid));
                            return $u.executeSQL(db,updateto);
                        });
                    }
                ],
                // TODO : Check if updates are blocked.
                afterupdate : [
                    function(db, element) {
                        var deferred = Q.defer();
                        deferred.reject("Updates on transactions are not allowed.");
                        return deferred.promise;
                    }
                ]
            },
            {
                type: "/interletsapprovals",
                public: false,
                map: {
                    community: {references: '/communities'},
                    approved: {references: '/communities'}
                },
                secure: [
                    // TODO : Add security.
                    // Only admins should be allowed to create / approve a new interlets approval.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    community: $s.permalink("/communities"),
                    approved: $s.permalink("/communities")
                },
                query : {
                    approved: filterReferencedType("communities","approved")
                },
                beforeinsert : [],
                beforeupdate : [],
                beforedelete : [],
                afterinsert : [],
                afterupdate : [],
                afterdelete : []
            },
            {
                type: "/interletssettings",
                public: false,
                map: {
                    person: {references: '/persons'},
                    interletsapproval: {references: '/interletsapprovals'},
                    active: {}
                },
                secure: [
                    // TODO : Add security.
                    // Only admins should be allowed to create / approve a new interlets approval.
                ],
                schemaUtils: {
                    $schema: "http://json-schema.org/schema#",
                    person: $s.permalink("/persons"),
                    interletsApproval: $s.permalink("/interletsapprovals"),
                    active: $s.boolean
                },
                validate: [],
                query : {
                    person : filterReferencedType("persons","person")
                },
                beforeinsert : [],
                beforeupdate : [],
                beforedelete : [],
                afterinsert : [],
                afterupdate : [],
                afterdelete: []
            }
        ]
    });

app.get('/sendmails', function(request, response) {
    mail4elas.sendMail(Date.now());
    response.send("Done.");
    response.end();
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
});

//mail4elas.run();
//mail4elas.sendMail(Date.now());