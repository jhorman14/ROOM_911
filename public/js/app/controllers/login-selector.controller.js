(function() {
    angular.module('miApp')
        .controller('LoginSelectorController', LoginSelectorController);

    LoginSelectorController.$inject = ['$location'];

    function LoginSelectorController($location) {
        var vm = this;

        vm.goToEmployeeLogin = function() {
            $location.path('/login/employee');
        };

        vm.goToAdminLogin = function() {
            $location.path('/login/admin');
        };
    }
})();