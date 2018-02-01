const app = angular.module('app');
const window = require('window');
const cdn = window.cdn || '';

app.factory('payDialog', ['$mdDialog', '$interval', '$timeout', '$http', '$localStorage', ($mdDialog, $interval, $timeout, $http, $localStorage) => {
  const publicInfo = {
    config: JSON.parse(window.ssmgrConfig),
    orderType: 'month',
    time: [{
      type: 'hour', name: '一小时'
    }, {
      type: 'day', name: '一天'
    }, {
      type: 'week', name: '一周'
    }, {
      type: 'month', name: '一个月'
    }, {
      type: 'season', name: '三个月'
    }, {
      type: 'year', name: '一年'
    }],
  };
  let dialogPromise = null;
  const createOrder = () => {
    publicInfo.status = 'loading';
    publicInfo.status = 'pay';
  };
  let interval = null;
  const close = () => {
    interval && $interval.cancel(interval);
    $mdDialog.hide();
  };
  publicInfo.createOrder = createOrder;
  publicInfo.close = close;
  const dialog = {
    templateUrl: `${ cdn }/public/views/dialog/pay.html`,
    escapeToClose: false,
    locals: { bind: publicInfo },
    bindToController: true,
    fullscreen: true,
    controller: ['$scope', '$mdDialog', '$mdMedia', 'bind', function ($scope, $mdDialog, $mdMedia, bind) {
      $scope.publicInfo = bind;
      $scope.setDialogWidth = () => {
        if ($mdMedia('xs') || $mdMedia('sm')) {
          return {};
        }
        return { 'min-width': '405px' };
      };
      $scope.getQrCodeSize = () => {
        if ($mdMedia('xs') || $mdMedia('sm')) {
          return 200;
        }
        return 250;
      };
      $scope.qrCode = () => {
        return $scope.publicInfo.qrCode || 'invalid qrcode';
      };
      $scope.pay = () => {
        window.location.href = $scope.publicInfo.qrCode;
      };
    }],
    clickOutsideToClose: false,
  };
  const chooseOrderType = accountId => {
    publicInfo.status = 'loading';
    dialogPromise = $mdDialog.show(dialog);
    $http.get('/api/user/order/price').then(success => {
      publicInfo.alipay = success.data.alipay;
      publicInfo.zarinpal = success.data.zarinpal;
      $timeout(() => {
        publicInfo.status = 'choose';
      }, 125);
      publicInfo.accountId = accountId;
      return dialogPromise;
    }).catch(() => {
      publicInfo.status = 'error';
      return dialogPromise;
    });
  };

  const createZarinpalOrder = () => {
    $http.get(`/api/user/zarinpal/create?accountId=${publicInfo.accountId}&orderType=${publicInfo.orderType}`)
      .then(({ data: { redirectUrl } }) => {
        window.location.replace(redirectUrl)
      })
      .catch(error => console.log('error ', error))
  };
  publicInfo.createZarinpalOrder = createZarinpalOrder;

  return {
    chooseOrderType,
    createOrder,
    createZarinpalOrder,
  };
}]);