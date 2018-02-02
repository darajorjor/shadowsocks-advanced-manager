const app = angular.module('app');
const window = require('window');
const cdn = window.cdn || '';

app.config(['$stateProvider', $stateProvider => {
  $stateProvider
    .state('user.account', {
      url: '/account',
      controller: 'UserAccountController',
      templateUrl: `${ cdn }/public/views/user/account.html`,
    })
    .state('user.accountPage', {
      url: '/account/:accountId',
      controller: 'UserAccountPageController',
      templateUrl: `${ cdn }/public/views/user/accountPage.html`,
    })
    .state('user.addAccount', {
      url: '/addAccount',
      controller: 'UserAddAccountController',
      templateUrl: `${ cdn }/public/views/user/addAccount.html`,
    })
    .state('user.editAccount', {
      url: '/account/:accountId/edit',
      controller: 'UserEditAccountController',
      templateUrl: `${ cdn }/public/views/user/editAccount.html`,
    });
  }])
;