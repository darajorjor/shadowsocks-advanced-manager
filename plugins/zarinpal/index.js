const log4js = require('log4js');
// const logger = log4js.getLogger('zarinpal');
const knex = appRequire('init/knex').knex;
const cron = appRequire('init/cron');
const ZarinpalCheckout = require('zarinpal-checkout');
const account = appRequire('plugins/account/index');
const moment = require('moment');
const push = appRequire('plugins/webgui/server/push');
const config = appRequire('services/config').all();

let zarinpal
if (config.plugins.zarinpal && config.plugins.zarinpal.use) {
  zarinpal = ZarinpalCheckout.create(config.plugins.zarinpal.api_key, config.plugins.zarinpal.sandbox);
}

const createOrder = async (user, account, amount, type, fullUrl) => {
  try {
    const orderSetting = await knex('webguiSetting').select().where({
      key: 'payment',
    }).then(success => {
      if (!success.length) {
        return Promise.reject('settings not found');
      }
      success[0].value = JSON.parse(success[0].value);
      return success[0].value;
    }).then(success => {
      if (type === 5) {
        return success.hour;
      }
      else if (type === 4) {
        return success.day;
      }
      else if (type === 2) {
        return success.week;
      }
      else if (type === 3) {
        return success.month;
      }
      else if (type === 6) {
        return success.season;
      }
      else if (type === 7) {
        return success.year;
      }
    });
    const payment = await new Promise((resolve, reject) => {
      zarinpal.PaymentRequest({
        Amount: amount,
        CallbackURL: fullUrl,
        Description: orderSetting.orderName || 'شارژ حساب کاربری',
        Email: config.plugins.zarinpal.email || 'nitrorayan@gmail.com',
        Mobile: config.plugins.zarinpal.mobile || '09120000000',
      }).then((response) => {
        if (response.status === 100) {
          console.log(response)
          resolve(response)
        } else {
          console.error(response)
          return reject(response.status);
        }
      }).catch((error) => {
        console.error(error)
        return reject(error);
      });
    });
    const orderId = moment().format('YYYYMMDDHHmmss') + Math.random().toString().substr(2, 6);
    await knex('zarinpal').insert({
      orderId,
      zarinpalId: payment.authority,
      orderType: type,
      amount: amount + '',
      user,
      account: (account !== 'undefined' && account) ? account : null,
      status: 'pending',
      createTime: Date.now(),
      expireTime: Date.now() + 2 * 60 * 60 * 1000,
    });
    return { redirectUrl: payment.url };
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};

const executeOrder = async (amount, Authority) => {
  return new Promise((resolve, reject) => {
    zarinpal.PaymentVerification({
      Amount: amount,
      Authority,
    }).then((res) => {
      if (res.status === -21) {
        return knex('zarinpal').update({ status: 'failed', zarinpalData: JSON.stringify(res) }).where({ zarinpalId: Authority })
          .then(success => resolve(success))
          .catch(e => { throw e })
      } else { // Payment Successful.
        return knex('zarinpal').update({ status: 'verified', zarinpalData: JSON.stringify(res) }).where({ zarinpalId: Authority })
          .then(success => resolve(success))
          .catch(e => {
            console.log('error updating')
            throw e
          })
      }
    })
      .catch((error) => {
        return reject(error);
      })
  });
};

exports.createOrder = createOrder;
exports.executeOrder = executeOrder;

// const checkOrder = async zarinpalId => {
//   const orderInfo = await new Promise((resolve, reject) => {
//     zarinpal.payment.get(zarinpalId, function (error, payment) {
//       if (error) {
//         console.log(error);
//         reject(error);
//       } else {
//         resolve(payment);
//       }
//     });
//   });
//   await knex('zarinpal').update({
//     status: orderInfo.state,
//     zarinpalData: JSON.stringify(orderInfo)
//   }).where({ zarinpalId });
//   return;
// };

// const sendSuccessMail = async userId => {
//   const emailPlugin = appRequire('plugins/email/index');
//   const user = await knex('user').select().where({
//     type: 'normal',
//     id: userId,
//   }).then(success => {
//     if (success.length) {
//       return success[0];
//     }
//     return Promise.reject('user not found');
//   });
//   const orderMail = await knex('webguiSetting').select().where({
//     key: 'mail',
//   }).then(success => {
//     if (!success.length) {
//       return Promise.reject('settings not found');
//     }
//     success[0].value = JSON.parse(success[0].value);
//     return success[0].value.order;
//   });
//   await emailPlugin.sendMail(user.email, orderMail.title, orderMail.content);
// };

// cron.minute(async () => {
//   if (!config.plugins.zarinpal || !config.plugins.zarinpal.use) {
//     return;
//   }
//   const orders = await knex('zarinpal').select().whereNotBetween('expireTime', [0, Date.now()]);
//   const scanOrder = order => {
//     if (order.status !== 'approved' && order.status !== 'finish') {
//       return checkOrder(order.zarinpalId);
//     } else if (order.status === 'approved') {
//       const accountId = order.account;
//       const userId = order.user;
//       push.pushMessage('支付成功', {
//         body: `订单[ ${ order.orderId } ][ ${ order.amount } ]支付成功`,
//       });
//       return checkOrder(order.zarinpalId).then(() => {
//         return account.setAccountLimit(userId, accountId, order.orderType);
//       }).then(() => {
//         return knex('zarinpal').update({
//           status: 'finish',
//         }).where({
//           orderId: order.orderId,
//         });
//       }).then(() => {
//         logger.info(`订单支付成功: [${ order.orderId }][${ order.amount }][account: ${ accountId }]`);
//         sendSuccessMail(userId);
//       }).catch(err => {
//         logger.error(`订单支付失败: [${ order.orderId }]`, err);
//       });
//     }
//     ;
//   };
//   for (const order of orders) {
//     await scanOrder(order);
//   }
// }, 1);

const orderList = async (options = {}) => {
  const where = {};
  if (options.userId) {
    where['user.id'] = options.userId;
  }
  const orders = await knex('zarinpal').select([
    'zarinpal.orderId',
    'zarinpal.orderType',
    'user.id as userId',
    'user.username',
    'account_plugin.port',
    'zarinpal.amount',
    'zarinpal.status',
    'zarinpal.zarinpalData',
    'zarinpal.createTime',
    'zarinpal.expireTime',
  ])
    .leftJoin('user', 'user.id', 'zarinpal.user')
    .leftJoin('account_plugin', 'account_plugin.id', 'zarinpal.account')
    .where(where)
    .orderBy('zarinpal.createTime', 'DESC');
  orders.forEach(f => {
    f.zarinpalData = JSON.parse(f.zarinpalData);
  });
  return orders;
};

const orderListAndPaging = async (options = {}) => {
  const search = options.search || '';
  const filter = options.filter || [];
  const sort = options.sort || 'zarinpal.createTime_desc';
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  let count = knex('zarinpal').select();
  let orders = knex('zarinpal').select([
    'zarinpal.orderId',
    'zarinpal.orderType',
    'user.id as userId',
    'user.username',
    'account_plugin.port',
    'zarinpal.amount',
    'zarinpal.status',
    'zarinpal.zarinpalData',
    'zarinpal.createTime',
    'zarinpal.expireTime',
  ])
    .leftJoin('user', 'user.id', 'zarinpal.user')
    .leftJoin('account_plugin', 'account_plugin.id', 'zarinpal.account');

  if (filter.length) {
    count = count.whereIn('zarinpal.status', filter);
    orders = orders.whereIn('zarinpal.status', filter);
  }
  if (search) {
    count = count.where('zarinpal.orderId', 'like', `%${ search }%`);
    orders = orders.where('zarinpal.orderId', 'like', `%${ search }%`);
  }

  count = await count.count('orderId as count').then(success => success[0].count);
  orders = await orders.orderBy(sort.split('_')[0], sort.split('_')[1]).limit(pageSize).offset((page - 1) * pageSize);
  orders.forEach(f => {
    f.zarinpalData = JSON.parse(f.zarinpalData);
  });
  const maxPage = Math.ceil(count / pageSize);
  return {
    total: count,
    page,
    maxPage,
    pageSize,
    orders,
  };
};

exports.orderListAndPaging = orderListAndPaging;
exports.orderList = orderList;

cron.minute(() => {
  if (!config.plugins.zarinpal || !config.plugins.zarinpal.use) {
    return;
  }
  knex('zarinpal').delete().where({ status: 'created' }).whereBetween('expireTime', [0, Date.now() - 1 * 24 * 3600 * 1000]).then();
}, 30);