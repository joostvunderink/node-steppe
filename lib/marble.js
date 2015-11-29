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
    // console.info('cleanup');
    done();
  }

  self.findAndProcessJob = function(queueName) {
    // console.info('fapj: %s', queueName);
    db.findUnfinishedJob({ queueName: queueName })
    .then(function(job) {
      // console.info('banana');
      if (!job) {
        return;
      }
      // console.info(job);

      let qd = queueDefinitions[queueName];

      if (job.step) {
        console.info('step found, handling');
        return qd.stepHandler({
          action : job.step.action,
          data   : job.step.data,
          jobData: job.data,
        })
        .then(function(result) {
          console.log('step handled ok');
          return db.stepOk({ jobId: job.id, result: result });
        })
        .catch(function(err) {
          console.error(err);
          return db.stepError({ jobId: job.id, error: err });
        });
      }
      else {
        console.info('all steps done');
        return qd.jobHandler({
          status: job.status,
          data: job.data,
        })
        .then(function(result) {
          console.log('job handled ok');
          return db.jobHandled({ jobId: job.id, result: result });
        })
        .catch(function(err) {
          console.log('job handled error');
          console.error(err);
          return db.jobHandled({ jobId: job.id, error: err });
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
