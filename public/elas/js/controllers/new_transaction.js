app.controller('elasNewTransactionController', function ($scope, $http, $base64, $location, elasBackend, $cacheFactory) {
    var communities = [];
    communities.push($scope.me.community.href);
    var ils = $scope.me.$$interletssettings;
    for(var i=0; i<ils.length; i++) {
        if(ils[i].active) {
            communities.push(ils[i].interletsapproval.$$expanded.approved.href);
        }
    }

    elasBackend.getListResourcePaged("/persons", {
        communities: communities.join(),
        orderby: 'firstname,lastname',
        descending: false
    }).then(function(persons) {
        $scope.people = persons.results;
        for(var i=0; i<$scope.people.length; i++) {
            var current = $scope.people[i];
            if(current.$$meta.permalink === $scope.me.$$meta.permalink) {
                $scope.people.splice(i,1);
                break;
            }
        }
    });

    $scope.transaction = { fromperson: {}, toperson: {} };
    $scope.person = {};

    $scope.createTransaction = function(formname) {
        if($scope[formname].$valid) {
            $scope.transaction.fromperson = { href: $scope.me.$$meta.permalink };
            $scope.transaction.toperson = { href: $scope.person.selected.$$meta.permalink };
            console.log($scope.transaction);
            elasBackend.createOrUpdateResource('transactions', $scope.transaction)
                .then(function ok(resp) {
                    var cache = $cacheFactory.get('$http');
                    cache.removeAll();
                    $location.url("/transactions.html");
                }, function failed(err) {
                    console.log(err);
                });
        }
    };

    $scope.errClass = function(formname,fieldname) {
        hasError = $scope.errShow(formname,fieldname);
        if(hasError) {
            return 'has-error';
        } else {
            return '';
        }
    };

    $scope.errShow = function(formname,fieldname) {
        var hasError = $scope[formname][fieldname].$invalid && $scope[formname][fieldname].$touched;
        if(hasError) {
            return true;
        } else {
            return false;
        }
    };
});
