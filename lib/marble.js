'use strict';

let Agenda = require('agenda');
var agenda = new Agenda({
  db: {
    address: 'mongodb://localhost/marbletest'
  }
});

var db = require('./db');
db.connect({
  type: 'mongo',
  url: 'mongodb://localhost/marbletest'
});

let common = require('./common');

var Marble = function() {
  var self = this;
  var queueDefinitions = [],
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
    queueDefinitions.forEach(function(queueDefinition) {
      agenda.define(queueDefinition.name, function(job, done) {
        self.findAndProcessQueueItem(queueDefinition.name);
        done();
      });
      agenda.every(queueDefinition.period, queueDefinition.name);
      db.createQueue({ queueName: queueDefinition.name });
    });
    agenda.start();
    agendaStatus.running = true;
    agenda.on('error', function(err) {
      console.error(err);
    });
  }


  self.configure = function(configuration) {

  };

  self.defineQueue = function(queueDefinition) {
    // name         : 'makePhotoAlbum',
    // parentHandler: handleParent,
    // childHandler : handleChild,
    // period       : '20 seconds'
    queueDefinitions.push(queueDefinition);
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

  self.findAndProcessQueueItem = function(queueName) {
    console.info('pqi: %s', queueName);
  }
}

module.exports = Marble;
