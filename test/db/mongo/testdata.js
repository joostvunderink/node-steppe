'use strict';

module.exports = {
  jobData1: jobData1(),
};

function jobData1() {
  return {
    queueName: 'activities',
    jobData: { location: 'home' },
    steps: [
      {
        action  : 'buy_fruit',
        stepData: { fruit: 'banana' },
      },
      {
        action  : 'eat_fruit',
        stepData: { fruit: 'apple' },
      },
      {
        action  : 'paint_house',
        stepData: { colour: 'red' },
      },
    ]
  };
}
