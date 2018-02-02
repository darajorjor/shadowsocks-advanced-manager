const app = angular.module('app');

app
.controller('UserController', ['$scope', '$mdMedia', '$mdSidenav', '$state', '$http', '$interval', '$localStorage', 'userApi',
  ($scope, $mdMedia, $mdSidenav, $state, $http, $interval, $localStorage, userApi) => {
    if ($localStorage.home.status !== 'normal') {
      $state.go('home.index');
    } else {
      $scope.setMainLoading(false);
    }
    $scope.innerSideNav = true;
    $scope.sideNavWidth = () => {
      if($scope.innerSideNav) {
        return {
          width: '200px',
        };
      } else {
        return {
          width: '60px',
        };
      }
    };
    $scope.menuButton = function() {
      if($scope.menuButtonIcon) {
        return $scope.menuButtonClick();
      }
      if ($mdMedia('gt-sm')) {
        $scope.innerSideNav = !$scope.innerSideNav;
      } else {
        $mdSidenav('left').toggle();
      }
    };
    $scope.menus = [{
      name: '首页',
      icon: 'home',
      click: 'user.index'
    }, {
      name: '账号',
      icon: 'account_circle',
      click: 'user.account'
    }, {
      name: '设置',
      icon: 'settings',
      click: 'user.settings'
    }, {
      name: 'divider',
    }, {
      name: '退出',
      icon: 'exit_to_app',
      click: function() {
        $http.post('/api/home/logout').then(() => {
          $localStorage.home = {};
          $localStorage.user = {};
          $state.go('home.index');
        });
      },
    }];
    $scope.menuClick = index => {
      $mdSidenav('left').close();
      if(typeof $scope.menus[index].click === 'function') {
        $scope.menus[index].click();
      } else {
        $state.go($scope.menus[index].click);
      }
    };

    $scope.menuButtonIcon = '';
    $scope.menuButtonClick = () => {};
    $scope.setMenuButton = (icon, to) => {
      $scope.menuButtonIcon = icon;
      $scope.menuButtonClick = () => {
        $state.go(to);
      };
    };
    $scope.menuRightButtonClick = () => {
      $scope.$broadcast('RightButtonClick', 'click');
    };
    $scope.setMenuRightButton = (icon) => {
      $scope.menuRightButtonIcon = icon;
    };
    $scope.title = '';
    $scope.setTitle = str => { $scope.title = str; };
    $scope.interval = null;
    $scope.setInterval = interval => {
      $scope.interval = interval;
    };
    $scope.$on('$stateChangeStart', function(event, toUrl, fromUrl) {
      $scope.title = '';
      $scope.interval && $interval.cancel($scope.interval);
      $scope.menuButtonIcon = '';
    });



    $scope.menuButton = function() {
      if($scope.menuButtonIcon) {
        return $scope.menuButtonClick();
      }
      if ($mdMedia('gt-sm')) {
        $scope.innerSideNav = !$scope.innerSideNav;
      } else {
        $mdSidenav('left').toggle();
      }
    };
    $scope.menuClick = (index) => {
      $mdSidenav('left').close();
      if(typeof $scope.menus[index].click === 'function') {
        $scope.menus[index].click();
      } else {
        $state.go($scope.menus[index].click);
      }
    };
    $scope.title = '';
    $scope.setTitle = str => { $scope.title = str; };
    $scope.fabButton = false;
    $scope.fabButtonClick = () => {};
    $scope.setFabButton = (fn) => {
      $scope.fabButton = true;
      $scope.fabButtonClick = fn;
    };
    $scope.menuButtonIcon = '';
    $scope.menuButtonClick = () => {};

    /**
     * Copied from admin
     * */

    let isHistoryBackClick = false;
    let menuButtonHistoryBackState = '';
    let menuButtonHistoryBackStateParams = {};
    const menuButtonBackFn = (to, toParams = {}) => {
      if(menuButtonHistoryBackState) {
        return function () {
          isHistoryBackClick = true;
          $state.go(menuButtonHistoryBackState, menuButtonHistoryBackStateParams);
        };
      } else {
        return function () {
          isHistoryBackClick = false;
          $state.go(to, toParams);
        };
      }
    };
    $scope.setMenuButton = (icon, to, toParams = {}) => {
      $scope.menuButtonIcon = icon;
      if(typeof to === 'string') {
        $scope.menuButtonClick = menuButtonBackFn(to, toParams);
      } else {
        isHistoryBackClick = true;
        $scope.menuButtonClick = to;
      }
    };
    $scope.menuRightButtonIcon = '';
    $scope.menuRightButtonClick = () => {
      $scope.$broadcast('RightButtonClick', 'click');
    };
    $scope.setMenuRightButton = (icon) => {
      $scope.menuRightButtonIcon = icon;
    };
    $scope.menuSearchButtonIcon = '';
    $scope.menuSearch = {
      input: false,
      text: '',
    };
    $scope.menuSearchButtonClick = () => {
      $scope.menuSearch.input = true;
    };
    $scope.setMenuSearchButton = (icon) => {
      $scope.menuSearchButtonIcon = icon;
    };
    $scope.cancelSearch = () => {
      $scope.menuSearch.text = '';
      $scope.menuSearch.input = false;
      $scope.$broadcast('cancelSearch', 'cancel');
    };
    $scope.interval = null;
    $scope.setInterval = interval => {
      $scope.interval = interval;
    };
    $scope.$on('$stateChangeStart', function(event, toUrl, fromUrl) {
      $scope.fabButton = false;
      $scope.title = '';
      $scope.menuButtonIcon = '';
      $scope.menuRightButtonIcon = '';
      $scope.menuSearchButtonIcon = '';
      $scope.menuSearch.text = '';
      $scope.menuSearch.input = false;
      $scope.interval && $interval.cancel($scope.interval);
      if(!isHistoryBackClick) {
        const str = angular.copy($state.current.name);
        const obj = angular.copy($state.params);
        menuButtonHistoryBackState = str;
        menuButtonHistoryBackStateParams = obj;
      } else {
        isHistoryBackClick = false;
        menuButtonHistoryBackState = '';
        menuButtonHistoryBackStateParams = {};
      }
    });

    /**
     * End Copied from admin
     * */

    if (!$localStorage.user.serverInfo && !$localStorage.user.accountInfo) {
      userApi.getAccount().then(success => {
        $localStorage.user.serverInfo = {
          data: success.servers,
          time: Date.now(),
        };
        $localStorage.user.accountInfo = {
          data: success.account,
          time: Date.now(),
        };
      });
    };
  }
])
.controller('UserIndexController', ['$scope', '$state', 'userApi', 'markdownDialog',
  ($scope, $state, userApi, markdownDialog) => {
    $scope.setTitle('Home');
    // $scope.notices = [];
    userApi.getNotice().then(success => {
      $scope.notices = success;
    });
    $scope.toMyAccount = () => {
      $state.go('user.account');
    };
    $scope.showNotice = notice => {
      markdownDialog.show(notice.title, notice.content);
    };
    $scope.toTelegram = () => {
      $state.go('user.telegram');
    };
  }
])
.controller('UserAccountController', ['$scope', '$http', '$mdMedia', 'userApi', 'alertDialog', 'payDialog', 'qrcodeDialog', '$interval', '$localStorage', 'changePasswordDialog',
])
.controller('UserSettingsController', ['$scope', '$state', 'userApi', 'alertDialog', '$http', '$localStorage',
  ($scope, $state, userApi, alertDialog, $http, $localStorage) => {
    $scope.setTitle('User Settings');
    $scope.toPassword = () => {
      $state.go('user.changePassword');
    };
    $scope.toTelegram = () => {
      $state.go('user.telegram');
    };
  }
])
.controller('UserChangePasswordController', ['$scope', '$state', 'userApi', 'alertDialog', '$http', '$localStorage',
  ($scope, $state, userApi, alertDialog, $http, $localStorage) => {
    $scope.setTitle('Change Password');
    $scope.setMenuButton('arrow_back', 'user.settings');
    $scope.data = {
      password: '',
      newPassword: '',
      newPasswordAgain: '',
    };
    $scope.confirm = () => {
      alertDialog.loading();
      userApi.changePassword($scope.data.password, $scope.data.newPassword).then(success => {
        alertDialog.show('修改密码成功，请重新登录', 'OK')
        .then(() => {
          return $http.post('/api/home/logout');
        }).then(() => {
          $localStorage.home = {};
          $localStorage.user = {};
          $state.go('home.index');
        });
      }).catch(err => {
        alertDialog.show('修改密码失败', 'OK');
      });
    };
  }
])
.controller('UserTelegramController', ['$scope', '$state', 'userApi', 'alertDialog', '$http', '$localStorage', '$interval',
  ($scope, $state, userApi, alertDialog, $http, $localStorage, $interval) => {
    $scope.setTitle('Bind Telegram');
    $scope.setMenuButton('arrow_back', 'user.settings');
    $scope.isLoading = true;
    $scope.code = {};
    const getCode = () => {
      $http.get('/api/user/telegram/code').then(success => {
        $scope.code = success.data;
        $scope.isLoading = false;
      });
    };
    $scope.setInterval($interval(() => {
      getCode();
    }, 5 * 1000));
    getCode();
    $scope.unbind = () => {
      $scope.isLoading = true;
      $http.post('/api/user/telegram/unbind');
    };
  }
]);
