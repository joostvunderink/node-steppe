'use strict';

module.exports = {
  jobData1: jobData1(),
};

function jobData1() {
  return {
    queueName: 'activities',
    data: { location: 'home' },
    steps: [
      {
        action   : 'buy_fruit',
        data     : { fruit: 'banana' },
      },
      {
        action   : 'eat_fruit',
        data     : { fruit: 'apple' },
      },
      {
        action   : 'paint_house',
        data     : { colour: 'red' },
      },
    ]
  };
}
