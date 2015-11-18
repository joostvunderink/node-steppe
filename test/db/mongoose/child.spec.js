'use strict';

let should = require('should');

let mongoose = require('mongoose');
let mockgoose = require('mockgoose');
mockgoose(mongoose);
let db = require('../../../lib/db/mongo');
db.connect({ url: 'mongo://localhost/marble_unittest' });

let Q = require('q');
let _ = require('lodash');
let Child = require('../../../lib/db/mongo/child');
let common = require('../../../lib/common');

describe('Mongoose Child item', function() {
  beforeEach(function(done) {
    Q(Child.remove({}).exec())
    .then(function() {
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should create child items', function(done) {
    let childrenData = {
      queueName: 'test1',
      parentId : '7',
      children: [
        {
          data     : { fruit: 'banana' },
          type     : 'buy_fruit',
        },
        {
          data     : { fruit: 'apple' },
          type     : 'eat_fruit',
        },
        {
          data     : { colour: 'red' },
          type     : 'paint_house',
        },
      ]
    };
    db.createChildren(childrenData)
    .then(function(createdChildren) {
      return Q(Child.find({}).sort({sequence: 1}).exec());
    })
    .then(function(children) {
      children.should.be.an.Array.and.have.length(3);

      for (let i = 0; i < childrenData.children.length; i++) {
        children[i].sequence .should.equal(i + 1);
        children[i].queueName.should.equal(childrenData.queueName);
        children[i].parentId .should.equal(childrenData.parentId);
        children[i].type     .should.equal(childrenData.children[i].type);
        children[i].data     .should.eql  (childrenData.children[i].data);
      }
      done();
    })
    .catch(function(err) {
      console.error(err);
      done(err);
    });
  });

});
