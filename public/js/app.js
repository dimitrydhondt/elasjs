var app = angular.module('letsApp', ['ngRoute','angular-flexslider', 'notifications']);

app.controller('letsController', function ($scope) {
    $scope.flexSlides = [];
    $scope.flexSlides.push({
        image : "img/photos/1.jpg",
        title : "Gemeenschapsmunt",
        para : "Korte beschrijving..."
    });
    $scope.flexSlides.push({
        image : "img/photos/2.jpg",
        title : "Informatie",
        para : "Even kort toelichten..."
    });
    $scope.flexSlides.push({
        image : "img/photos/3.jpg",
        title : "Titel",
        para : "..."
    });
    $scope.loggedIn = true;

    var logonForm = {};
    $scope.logonForm = logonForm;
});

app.controller('calendarController', function ($scope, $http) {
    //https://www.google.com/calendar/ical/01i2d6ret8gq1j24or8urnv7oc%40group.calendar.google.com/public/basic.ics
    //https://www.google.com/calendar/ical/feestdagenbelgie%40gmail.com/public/basic.ics
    $http.get("https://www.google.com/calendar/feeds/feestdagenbelgie%40gmail.com/public/full?orderby=starttime&sortorder=ascending&futureevents=true&alt=json").success(function(cal) {
        $scope.events = [];
        angular.forEach(cal.feed.entry, function(value, key) {
            $scope.events.push({title : value.title.$t, content : value.content.$t, date : value.gd$when[0].startTime });
        });
        console.log($scope.events);
    });
});

app.controller('facebookController', function ($scope, $http) {
    var profileid = "649689358450200"; // EVA Dendermonde profile id.
    var appid = "1526197424288290"; // facebook app, only used to read public page.
    var appsecret = "ee4c2c5eee5508f99b9c3e16c7d7ef34"; // secret for this app. publicly exposed, so don't re-use.

    $http.get("https://graph.facebook.com/oauth/access_token?grant_type=client_credentials&client_id=" + appid + "&client_secret=" + appsecret).success(function(authtoken) {
        $http.get("https://graph.facebook.com/"+profileid+"/feed?" + authtoken).success(function(feed) {
            $scope.posts = [];
            // Filter marked messages for the publication on the website
            angular.forEach(feed.data, function(post, index) {
                if(post.message) {
                    var key = "*";
                    var message = post.message.trim();
                    if(message.indexOf(key, message.length - key.length) !== -1) {
                        post.message = post.message.substr(0,post.message.length - 1);
                        $scope.posts.push(post);
                    }
                }
            });
        });
    });
});

app.controller('elasMessagesController', function ($scope, $http, $q, elasBackend) {
    elasBackend.getListResourcePaged('/messages')
    .then(function(list) {
        var promises = [];
        angular.forEach(list.results, function(message,key) {
            promises.push(elasBackend.expandPerson(message, 'person'));
        });
        $q.all(promises)
            .then(function(result) {
                $scope.messages = result;
            });
    });
});

app.controller('elasMembersController', function($scope, $http, $q, elasBackend) {
    elasBackend.getListResourcePaged("/persons")
        .then(function(list) {
        $scope.persons = list.results;
    });
});

app.controller('elasTransactionsController', function($scope, $http, $q, elasBackend) {
    elasBackend.getListResourcePaged('/transactions')
        .then(function(list) {
            var promises = [];
            angular.forEach(list.results, function(transaction,key) {
                promises.push(elasBackend.expandPerson(transaction, 'fromperson'));
                promises.push(elasBackend.expandPerson(transaction, 'toperson'));
            });
            $q.all(promises)
                .then(function(result) {
                    $scope.transactions = list.results;
                });
        });
});

app.controller('elasLoginController', function ($scope, $http) {
});

app.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/elas/login.html', {
                templateUrl: 'elas/login.html',
                controller: 'elasLoginController'
            }).
            when('/elas/messages.html', {
                templateUrl: 'elas/messages.html',
                controller: 'elasMessagesController'
            }).
            when('/elas/members.html', {
                templateUrl: 'elas/members.html',
                controller: 'elasMembersController'
            }).
            when('/elas/transactions.html', {
                templateUrl: 'elas/transactions.html',
                controller: 'elasTransactionsController'
            }).
            when('/contact.html', {
                templateUrl: 'contact.html'
            }).
            when('/calendar.html', {
                templateUrl: 'calendar.html',
                controller: 'calendarController'
            }).
            when('/', {
                templateUrl: 'root.html',
                controller: 'facebookController'
            }).
            otherwise({
                redirectTo: '/#/'
            });
    }]);

