const user = appRequire('plugins/user/index');
const account = appRequire('plugins/account/index');
const flow = appRequire('plugins/flowSaver/flow');
const knex = appRequire('init/knex').knex;
const emailPlugin = appRequire('plugins/email/index');
const config = appRequire('services/config').all();

const alipay = appRequire('plugins/alipay/index');

exports.getAccount = (req, res) => {
  const userId = req.session.user
  const userType = req.session.type

  account.getAccount({ owner: userType === 'normal' ? userId : null }).then(success => {
    success.forEach(account => {
      account.data = JSON.parse(account.data);
      if(account.type >= 2 && account.type <= 5) {
        const time = {
          '2': 7 * 24 * 3600000,
          '3': 30 * 24 * 3600000,
          '4': 24 * 3600000,
          '5': 3600000,
        };
        account.data.expire = account.data.create + account.data.limit * time[account.type];
        account.data.from = account.data.create;
        account.data.to = account.data.create + time[account.type];
        while(account.data.to <= Date.now()) {
          account.data.from = account.data.to;
          account.data.to = account.data.from + time[account.type];
        }
      }
    });
    success.sort((a, b) => {
      return a.port >= b.port ? 1 : -1;
    });
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getOneAccount = (req, res) => {
  // const userId = req.session.user;
  const accountId = +req.params.accountId;
  account.getAccount({
    id: accountId,
    // userId,
  }).then(success => {
    console.log('success ========>>>>', success)
    if(!success.length) {
      res.send({});
      return;
    }
    const accountInfo = success[0];
    accountInfo.data = JSON.parse(accountInfo.data);
    console.log('accountInfo.data ========>>>>', accountInfo.data)
    if(accountInfo.type >= 2 && accountInfo.type <= 5) {
      const time = {
        '2': 7 * 24 * 3600000,
        '3': 30 * 24 * 3600000,
        '4': 24 * 3600000,
        '5': 3600000,
      };
      accountInfo.data.expire = accountInfo.data.create + accountInfo.data.limit * time[accountInfo.type];
      accountInfo.data.from = accountInfo.data.create;
      accountInfo.data.to = accountInfo.data.create + time[accountInfo.type];
      while(accountInfo.data.to <= Date.now()) {
        accountInfo.data.from = accountInfo.data.to;
        accountInfo.data.to = accountInfo.data.from + time[accountInfo.type];
      }
    }
    res.send(accountInfo);
  }).catch(err => {
    console.log(err);
    res.status(500).end();
  });;
};

exports.addAccount = (req, res) => {
  const userId = req.session.user

  // req.checkBody('port', 'Invalid port').isInt({min: 1, max: 65535});
  req.checkBody('password', 'Invalid password').notEmpty();
  req.checkBody('time', 'Invalid time').notEmpty();
  req.getValidationResult().then(async result => {
    if(result.isEmpty()) {
      const getNewPort = () => {
        return knex('webguiSetting').select().where({
          key: 'account',
        }).then(success => {
          if(!success.length) { return Promise.reject('settings not found'); }
          success[0].value = JSON.parse(success[0].value);
          return success[0].value.port;
        }).then(port => {
          if(port.random) {
            const getRandomPort = () => Math.floor(Math.random() * (port.end - port.start + 1) + port.start);
            let retry = 0;
            let myPort = getRandomPort();
            const checkIfPortExists = port => {
              let myPort = port;
              return knex('account_plugin').select()
                .where({ port }).then(success => {
                  if(success.length && retry <= 30) {
                    retry++;
                    myPort = getRandomPort();
                    return checkIfPortExists(myPort);
                  } else if (success.length && retry > 30) {
                    return Promise.reject('Can not get a random port');
                  } else {
                    return myPort;
                  }
                });
            };
            return checkIfPortExists(myPort);
          } else {
            return knex('account_plugin').select()
              .whereBetween('port', [port.start, port.end])
              .orderBy('port', 'DESC').limit(1).then(success => {
                if(success.length) {
                  return success[0].port + 1;
                }
                return port.start;
              });
          }
        });
      };

      const port = await getNewPort();
      const password = req.body.password;
      const time = req.body.time;

      return knex('webguiSetting').select().where({
        key: 'account',
      })
        .then(success => JSON.parse(success[0].value))
        .then(success => {
          const newUserAccount = success.accountForNewUser;

          if(!newUserAccount.isEnable) {
            // not enabled
          }

          return account.addAccount(newUserAccount.type || 5, { // account type
            port,
            password,
            time,
            limit: newUserAccount.limit || 8,
            flow: (newUserAccount.flow ? newUserAccount.flow : 350) * 1000000,
            server: newUserAccount.server ? JSON.stringify(newUserAccount.server): null,
            autoRemove: newUserAccount.autoRemove ? 1 : 0,
            owner: userId,
            user: userId,
          });
        });
    }
    result.throw();
  }).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.deleteAccount = (req, res) => {
  const accountId = req.params.accountId;
  const userId = req.session.user
  account.delAccount(accountId, userId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.changeAccountData = (req, res) => {
  const accountId = req.params.accountId;
  console.log('req.body.port ================>>>>>>>>>> ', req.params.accountId)
  console.log(req.body.port)
  console.log(req.body.password)
  console.log(req.body.autoRemove)
  account.editAccount(accountId, {
    // type: req.body.type,
    port: +req.body.port,
    password: req.body.password,
    // time: req.body.time,
    // limit: +req.body.limit,
    // flow: +req.body.flow,
    autoRemove: +req.body.autoRemove,
    // server: req.body.server,
  }).then(success => {
    console.log('success ', success)
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getServers = (req, res) => {
  const userId = req.session.user;
  let servers;
  knex('server').select(['id', 'host', 'name', 'method', 'scale', 'comment', 'shift']).orderBy('name')
  .then(success => {
    servers = success;
    return account.getAccount({
      owner: userId,
    }).then(accounts => {
      return accounts.map(f => {
        f.server = f.server ? JSON.parse(f.server) : f.server;
        return f;
      });
    });
  })
  .then(success => {
    if(!success.length) {
      return res.send([]);
    }
    const isAll = success.some(account => {
      if(!account.server) { return true; }
    });
    if(isAll) {
      return res.send(servers);
    } else {
      let accountArray = [];
      success.forEach(account => {
        account.server.forEach(s => {
          if(accountArray.indexOf(s) < 0) {
            accountArray.push(s);
          }
        });
      });
      return res.send(servers.filter(f => {
        return accountArray.indexOf(f.id) >= 0;
      }));
    }
  }).catch(err => {
    console.log(err);
    res.status(500).end();
  });
};

exports.getServerPortFlow = (req, res) => {
  const serverId = +req.params.serverId;
  const accountId = +req.params.accountId;
  let account = null;
  knex('account_plugin').select().where({
    id: accountId,
  }).then(success => {
    if(!success.length) {
      return Promise.reject('account not found');
    }
    account = success[0];
    account.data = JSON.parse(account.data);
    const time = {
      '2': 7 * 24 * 3600000,
      '3': 30 * 24 * 3600000,
      '4': 24 * 3600000,
      '5': 3600000,
    };
    if(account.type >=2 && account.type <= 5) {
      const timeArray = [account.data.create, account.data.create + time[account.type]];
      if(account.data.create <= Date.now()) {
        let i = 0;
        while(account.data.create + i * time[account.type] <= Date.now()) {
          timeArray[0] = account.data.create + i * time[account.type];
          timeArray[1] = account.data.create + (i + 1) * time[account.type];
          i++;
        }
      }
      return knex('webguiSetting').select().where({ key: 'account' })
      .then(success => {
        if(!success.length) {
          return Promise.reject('settings not found');
        }
        success[0].value = JSON.parse(success[0].value);
        return success[0].value.multiServerFlow;
      }).then(isMultiServerFlow => {
        return flow.getServerPortFlow(serverId, accountId, timeArray, isMultiServerFlow);
      });
    } else {
      return [ 0 ];
    }
  }).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getServerPortLastConnect = (req, res) => {
  const serverId = +req.params.serverId;
  const accountId = +req.params.accountId;
  flow.getlastConnectTime(serverId, accountId)
  .then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.changeShadowsocksPassword = (req, res) => {
  const accountId = +req.params.accountId;
  const password = req.body.password;
  if(!password) { return res.status(403).end(); }
  const isUserHasTheAccount = (accountId) => {
    return account.getAccount({userId: req.session.user, id: accountId}).then(success => {
      if(success.length) {
        return;
      }
      return Promise.reject();
    });
  };
  isUserHasTheAccount(accountId).then(() => {
    return account.changePassword(accountId, password);
  }).then(() => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.createOrder = (req, res) => {
  const userId = req.session.user;
  const accountId = req.body.accountId;
  const orderType = req.body.orderType;
  let type;
  let amount;
  if(orderType === 'week') { type = 2; }
  else if(orderType === 'month') { type = 3; }
  else if(orderType === 'day') { type = 4; }
  else if(orderType === 'hour') { type = 5; }
  else if(orderType === 'season') { type = 6; }
  else if(orderType === 'year') { type = 7; }
  else { return res.status(403).end(); }
  knex('webguiSetting').select().where({
    key: 'payment',
  }).then(success => {
    if(!success.length) {
      return Promise.reject('settings not found');
    }
    success[0].value = JSON.parse(success[0].value);
    return success[0].value;
  }).then(success => {
    amount = success[orderType].alipay;
    return alipay.createOrder(userId, accountId, amount, type);
  }).then(success => {
    return res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.checkOrder = (req, res) => {
  const orderId = req.body.orderId;
  alipay.checkOrder(orderId).then(success => {
    return res.send({status: success});
  }).catch(() => {
    res.status(403).end();
  });
};

exports.alipayCallback = (req, res) => {
  const signStatus = alipay.verifyCallback(req.body);
  if(signStatus === false) {
    return res.send('error');
  }
  return res.send('success');
};

exports.getPrice = (req, res) => {
  const price = {
    alipay: {},
    zarinpal: {},
  };
  knex('webguiSetting').select().where({
    key: 'payment',
  }).then(success => {
    if(!success.length) {
      return Promise.reject('settings not found');
    }
    success[0].value = JSON.parse(success[0].value);
    return success[0].value;
  }).then(success => {
    for(const s in success) {
      price.alipay[s] = success[s].alipay;
      price.zarinpal[s] = success[s].zarinpal;
    }
    return res.send(price);
  }).catch(() => {
    res.status(403).end();
  });
};

exports.getNotice = (req, res) => {
  knex('notice').select().orderBy('time', 'desc').then(success => {
    return res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getAlipayStatus = (req, res) => {
  return res.send({
    status: config.plugins.alipay && config.plugins.alipay.use,
  });
};

exports.getMultiServerFlowStatus = (req, res) => {
  knex('webguiSetting').select().where({
    key: 'account',
  }).then(success => {
    if(!success.length) {
      return Promise.reject('settings not found');
    }
    success[0].value = JSON.parse(success[0].value);
    return success[0];
  }).then(success => {
    return res.send({ status: success.value.multiServerFlow });
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

const zarinpal = appRequire('plugins/zarinpal/index');

exports.createZarinpalOrder = (req, res) => {
  const userId = req.session.user;
  const accountId = req.query.accountId;
  const orderType = req.query.orderType;
  let type;
  let amount;
  if(orderType === 'week') { type = 2; }
  else if(orderType === 'month') { type = 3; }
  else if(orderType === 'day') { type = 4; }
  else if(orderType === 'hour') { type = 5; }
  else if(orderType === 'season') { type = 6; }
  else if(orderType === 'year') { type = 7; }
  else { return res.status(403).end(); }
  // amount = config.plugins.account.pay[orderType].price;
  knex('webguiSetting').select().where({
    key: 'payment',
  }).then(success => {
    if(!success.length) {
      return Promise.reject('settings not found');
    }
    success[0].value = JSON.parse(success[0].value);
    return success[0].value;
  }).then(success => {
    amount = success[orderType].zarinpal;
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    if (req.query.Authority) {
      if (req.query.Status === 'NOK') {
        return res.redirect(`http://${config.plugins.webgui.site}/user/account/${req.query.accountId}`)
      }
      return zarinpal.executeOrder(amount, req.query.Authority)
        .then(async () => {
          console.log('userId ======>>>>>>', userId, accountId, orderType)
          await account.setAccountLimit(userId, accountId, orderType);
          console.log(`http://${config.plugins.webgui.site}/user/account/${req.query.accountId}`)
          return res.redirect(`http://${config.plugins.webgui.site}/user/account/${req.query.accountId}`)
        })
        .catch(e => {
          console.error(e)
          throw e
        })
    } else {
      return zarinpal.createOrder(userId, accountId, amount, type, fullUrl)
        .then(({ redirectUrl }) => {
          res.status(200).json({ redirectUrl })
        })
        .catch(e => {
          throw e
        })
    }
  })
  .catch(error => {
    res.status(403).end();
  });
};

exports.executeZarinpalOrder = (req, res) => {
  zarinpal.executeOrder(req.body)
  .then(success => {
    res.send(success);
  })
  .catch(error => {
    res.status(403).end();
  });
};

exports.zarinpalCallback = (req, res) => {
  console.log(req.body);
  return res.send('success');
};

exports.changePassword = (req, res) => {
  const oldPassword = req.body.password;
  const newPassword = req.body.newPassword;
  if(!oldPassword || !newPassword) {
    return res.status(403).end();
  }
  const userId = req.session.user;
  user.changePassword(userId, oldPassword, newPassword).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getTelegramCode = (req, res) => {
  const telegramUser = appRequire('plugins/webgui_telegram/user');
  const userId = req.session.user;
  telegramUser.getCode(userId).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.unbindTelegram = (req, res) => {
  const telegramUser = appRequire('plugins/webgui_telegram/user');
  const userId = req.session.user;
  telegramUser.unbindUser(userId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};