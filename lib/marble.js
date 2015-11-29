'use strict';

let Agenda = require('agenda');
var agenda = new Agenda({
  db: {
    address: 'mongodb://localhost/marbletest'
  }
});

let Q = require('q');
let _ = require('lodash');

let common = require('./common');

let Marble = function(args) {
  let config = getConfig(args);
  let db = require('./db/' + config.db.type);
  db.connect(config.db);

  let self = this;
  let queueDefinitions = {},
      configuration = {},
      agendaStatus = {
        dbConnected: false,
        started: false,
        running: false,
      };

  self.STATUS = common.status;
  self.TYPE   = common.type;

  agenda.on('ready', function() {
    console.log('agenda.on ready');
    agendaStatus.dbConnected = true;

    if (agendaStatus.started) {
      startAgenda();
    }
  });

  function startAgenda() {
    console.log('startAgenda()');
    agenda.define('__cleanup', {}, self.cleanup);
    agenda.every('10 seconds', '__cleanup');
    _.keys(queueDefinitions).forEach(function(key) {
      let queueDefinition = queueDefinitions[key];
      agenda.define(queueDefinition.name, function(job, done) {
        self.findAndProcessJob(queueDefinition.name);
        done();
      });
      agenda.every(queueDefinition.period, queueDefinition.name);
    });
    agenda.start();
    agendaStatus.running = true;
    agenda.on('error', function(err) {
      console.error(err);
    });
  }

  self.defineQueue = function(queueDefinition) {
    // name         : 'makePhotoAlbum',
    // parentHandler: handleParent,
    // childHandler : handleChild,
    // period       : '20 seconds'
    queueDefinitions[queueDefinition.name] = queueDefinition;
    if (agendaStatus.running) {
      agenda.define(queueDefinition.name, function(job, done) {
        self.findAndProcessQueueItem(queueDefinition.name);
        done();
      });
      agenda.every(queueDefinition.period, queueDefinition.name)
    }
  };

  self.start = function() {
    console.log('starting marble');
    console.log(queueDefinitions);
    agendaStatus.started = true;
    if (agendaStatus.dbConnected) {
      console.log('db already connected -> starting agenda')
      startAgenda();
    }
    
    // agenda.on('ready', function() {
    //   agenda.start();
    // });
  };

  self.createJob = function(args) {
    return db.createJob(args);
  };

  self.cleanup = function(job, done) {
    console.info('cleanup');
    done();
  }

  // self.findAndProcessQueueItem = function(queueName) {
  //   console.info('pqi: %s', queueName);
  //   db.findUnprocessedQueueItem({ queueName: queueName })
  //   .then(function(data) {
  //     let qd = queueDefinitions[queueName];

  //     if (data.child) {
  //       console.info('cqi found, handling');
  //       // TODO: convert db object to data
  //       return qd.childHandler(data.child)
  //       .then(function(result) {
  //         console.log('child handled ok');
  //         return db.queueItemOk(data.child);
  //       })
  //       .catch(function(err) {
  //         console.error(err);
  //         return db.queueItemError(data.child, err);
  //       });
  //     }
  //     else if (data.parent) {
  //       console.info('pqi found, handling');
  //       // TODO: convert db object to data
  //       return qd.parentHandler(data.parent)
  //       .then(function(result) {
  //         console.log('parent handled ok');
  //         return db.queueItemOk(data.parent);
  //       })
  //       .catch(function(err) {
  //         console.error(err);
  //         return db.queueItemError(data.parent, err);
  //       });
  //     }
  //     else {
  //       console.info('no pqi found');
  //       return Q.resolve();
  //     }
  //   })
  //   .catch(function(err) {
  //     console.error(err);
  //     done(err);
  //   })
  // }

  self.findAndProcessJob = function(queueName) {
    // console.info('fapj: %s', queueName);
    db.findUnfinishedJob({ queueName: queueName })
    .then(function(data) {
      // console.info('banana');
      if (!data) {
        return;
      }
      console.info(data);

      let qd = queueDefinitions[queueName];

      if (data.step) {
        console.info('step found, handling');
        // TODO: convert db object to data
        return qd.stepHandler(data.step)
        .then(function(result) {
          console.log('step handled ok');
          return db.stepOk({ jobId: data.id });
        })
        .catch(function(err) {
          console.error(err);
          return db.stepError({ jobId: data.id, error: err });
        });
      }
      else {
        console.info('all steps done');
        // TODO: convert db object to data
        return qd.jobHandler(data)
        .then(function(result) {
          console.log('job handled ok');
          return db.jobHandled({ jobId: data.id });
        })
        .catch(function(err) {
          console.log('job handled error');
          console.error(err);
          return db.jobHandled({ jobId: data.id, error: err });
        });
      }
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    })
  }
}

function getConfig(args) {
  return {
    db: {
      type: 'mongo',
      url: 'mongodb://localhost/marbletest'
    }
  }
}

module.exports = Marble;
