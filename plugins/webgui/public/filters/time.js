const app = angular.module('app');

app.filter('timeago', function() {
  Math.trunc = Math.trunc || function (value) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  };
  const timeago = function(input) {
    let ret = '';
    let retTail = '';
    let time = Date.now() - (new Date(input));
    if (time < 0) {
      time = -time;
    } else {
      retTail = 'ago ';
    }
    const day = Math.trunc(time / (24 * 3600 * 1000));
    const hour = Math.trunc(time % (24 * 3600 * 1000) / (3600 * 1000));
    const minute = Math.trunc(time % (24 * 3600 * 1000) % (3600 * 1000) / (60 * 1000));
    if (day) {
      ret += day + 'days ';
    }
    if (day || hour) {
      ret += hour + 'hours ';
    }
    if (!day && (hour || minute)) {
      ret += minute + 'minutes ';
    }
    if (time < (60 * 1000)) {
      ret = 'a few seconds ';
    }
    return ret + retTail;
  };
  timeago.$stateful = true;
  return timeago;
});

app.filter('timeagoshort', function() {
  Math.trunc = Math.trunc || function (value) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  };
  return function(input) {

    let ret = '';
    let retTail = '';

    let time = Date.now() - (new Date(input));
    if (time < 0) {
      time = -time;
    } else {
      retTail = 'ago ';
    }

    const day = Math.trunc(time / (24 * 3600 * 1000));
    const hour = Math.trunc(time % (24 * 3600 * 1000) / (3600 * 1000));
    const minute = Math.trunc(time % (24 * 3600 * 1000) % (3600 * 1000) / (60 * 1000));
    if (day) {
      ret += day + 'days ';
    } else if (hour) {
      ret += hour + 'hours ';
    } else if (minute) {
      ret += minute + 'minutes ';
    } else if (time < (60 * 1000)) {
      ret = 'a few seconds ';
    }
    return ret + retTail;
  };
});

app.filter('translateTime', ['$translate', $translate => {
  return input => {
    const currentLanguage = $translate.use();
    if(currentLanguage === 'zh-CN') {
      return input;
    } else if (currentLanguage === 'en-US') {
      const matchDay = input.match(/([0-9]){1,}天/);
      const matchHour = input.match(/([0-9]){1,}小时/);
      const matchMinute = input.match(/([0-9]){1,}分/);
      let ret = '';
      if(matchDay) {
        ret += matchDay[0].substr(0, matchDay[0].length - 1) + (+matchDay[0].substr(0, matchDay[0].length - 1) <= 1 ? ' day ' : ' days ');
      }
      if(matchHour) {
        ret += matchHour[0].substr(0, matchHour[0].length - 2) + (+matchHour[0].substr(0, matchHour[0].length - 2) <= 1 ? ' hour ' : ' hours ');
      }
      if(matchMinute) {
        ret += matchMinute[0].substr(0, matchMinute[0].length - 1) + (+matchMinute[0].substr(0, matchMinute[0].length - 1) <= 1 ? ' min ' : ' mins');
      }
      if(input.match(/几秒/)) {
        ret += 'a few seconds';
      }
      if(input.match(/前$/)) {
        ret += ' ago';
      }
      return ret;
    }
  };
}]);
