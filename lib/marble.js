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
  if (!args) {
    args = {};
  }

  let config = getConfig(args);

  if (args.logger) {
    common.setLogger(args.logger);
  }

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
    common.getLogger().info('agenda.on ready');
    agendaStatus.dbConnected = true;

    if (agendaStatus.started) {
      startAgenda();
    }
  });

  function startAgenda() {
    common.getLogger().info('startAgenda()');
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
    common.getLogger().info('starting marble');
    common.getLogger().info(queueDefinitions);
    agendaStatus.started = true;
    if (agendaStatus.dbConnected) {
      common.getLogger().info('db already connected -> starting agenda')
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
        common.getLogger().debug('[job:%s] Step %s (%s): Calling handler.',
          job.id, job.stepIndex, job.step.action);
        return qd.stepHandler({
          action : job.step.action,
          data   : job.step.data,
          jobData: job.data,
        })
        .then(function(result) {
          common.getLogger().debug('[job:%s] Step %s: Handled ok.',
            job.id, job.stepIndex);
          if (result && result.hasOwnProperty('jobData')) {
            common.getLogger().debug('[job:%s] Step %s: Updating job data.',
              job.id, job.stepIndex);
          }
          return db.stepOk({ jobId: job.id, result: result });
        })
        .catch(function(result) {
          let error = result.error ? result.error : 'unknown error';
          return db.stepError({ jobId: job.id, error: error });
        });
      }
      else {
        common.getLogger().info('[job:%s] All steps done. Calling job handler.',
          job.id);
        return qd.jobHandler({
          status: job.status,
          data: job.data,
        })
        .then(function(result) {
          common.getLogger().debug('[job:%s] Job handler called ok.',
            job.id);
          common.getLogger().info('job handled ok');
          return db.jobHandled({ jobId: job.id, success: true, result: result });
        })
        .catch(function(err) {
          common.getLogger().error('[job:%s] Job handler error: %s',
            job.id, err);
          return db.jobHandled({ jobId: job.id, success: false, error: err });
        });
      }
    })
    .catch(function(err) {
      common.getLogger().error('Unknown error handling job:');
      common.getLogger().error(err);
    });
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
