const app = angular.module('app');

app.factory('userApi', ['$q', '$http', ($q, $http) => {
  let userAccountPromise = null;
  const getAccount = () => {
    if(userAccountPromise && !userAccountPromise.$$state.status) {
      return userAccountPromise;
    }
    userAccountPromise = $http.get('/api/user/account').then(success => success.data);
    return userAccountPromise;
  };
  let userOneAccountPromise = null
  const getOneAccount = (id) => {
    if(userOneAccountPromise && !userOneAccountPromise.$$state.status) {
      return userOneAccountPromise;
    }
    userOneAccountPromise = $http.get(`/api/user/account/${id}`).then(success => success.data);
    return userOneAccountPromise;
  };


  let macAccountPromise = null;
  const getMacAccount = () => {/*
    if(macAccountPromise && !macAccountPromise.$$state.status) {
      return macAccountPromise;
    }
    macAccountPromise = $http.get('/api/user/macAccount').then(success => success.data);*/
    return [];
  };

  const changeShadowsocksPassword = (accountId, password) => {
    return $http.put(`/api/user/${ accountId }/password`, {
      password,
    });
  };

  const changePassword = (password, newPassword) => {
    return $http.post('/api/user/changePassword', {
      password,
      newPassword,
    });
  };

  const updateAccount = account => {
    if(!account.length) {
      return $http.get('/api/user/account').then(success => {
        success.data.forEach(a => {
          account.push(a);
        });
      });
    } else {
      account.forEach((a, index) => {
        $http.get(`/api/user/account/${ a.id }`).then(success => {
          if(!success.data.id) {
            account.splice(index, 1);
            return;
          }
          a.password = success.data.password;
          a.data = success.data.data;
          a.type = success.data.type;
        });
      });
      return $q.resolve();
    }
  };

  let serverPortDataPromise = {};
  const getServerPortData = (account, serverId) => {
    if(serverPortDataPromise[`${ account.id }`] && !serverPortDataPromise[`${ account.id }`].$$state.status) {
      return serverPortDataPromise[`${ account.id }`];
    }
    const Promises = [
      $http.get(`/api/user/flow/${ serverId }/${ account.id }/lastConnect`),
    ];
    if(account.type >= 2 && account.type <= 5) {
      Promises.push(
        $http.get(`/api/user/flow/${ serverId }/${ account.id }`)
      );
    }
    serverPortDataPromise[`${ account.id }`] = $q.all(Promises).then(success => {
      return {
        lastConnect: success[0].data.lastConnect,
        flow: success[1] ? success[1].data[0] : null,
      };
    });
    return serverPortDataPromise[`${ account.id }`];
  };

  const getNotice = () => {
    return $http.get('/api/user/notice').then(success => success.data);
  };

  return {
    getServerPortData,
    getAccount,
    changeShadowsocksPassword,
    changePassword,
    updateAccount,
    getNotice,
    getMacAccount,
    getOneAccount,
  };
}]);
