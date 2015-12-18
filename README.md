# Steppe - a simply queueing system for linear jobs

## Introduction

Sometimes, you have to process a task that consists of multiple steps, and that takes a bit longer than your normal read or write operation. It can be complex to handle such a task with a series of callbacks or promises, especially if you want to be able to retry individual steps in case of failure.

Add to that the problem of your `node.js` server restarting in the middle of such a long-lived task - for example because a new version of your code is being deployed - and you have a challenge to solve.

Steppe is a module that helps you perform such tasks. You can create jobs with any number of steps, and define handler functions to handle steps. The state of the job, including any amount of additional custom data, is stored in a database for persistence. Each step can be retried a few times before it's considered to have errored.

## Installation

```npm install steppe```

## Terminology

A *step* is a single task.

A *job* is a collection of 1 or more steps, which are processed in sequence.

A *queue* defines a type of job, with its accompanying handler functions. Each job that you create, is created in a queue. This determines which handler functions will be called to process each step.

## Synopsis

```
    // You need 2 handler functions: one for each step, and one for when
    // the whole job has been finished.
    //
    // This is the step handler. It returns a promise to indicate
    // whether the step has been handled successfully or not.
    function stepHandler(data) {
        var stepData = data.stepData; // The data of this specific step.
        var jobData  = data.jobData;  // The data of the job. The same for each step.
        var action   = data.action;   // The action of the step.

        // Generate a promise with your favourite promise library.
        var promise = createPromise();

        // Perform the action necessary for this step.
        doStuff(action, stepData, jobData)
        .then(function(result) {
            promise.resolve();
        })
        .catch(function(error) {
            if (error === 'everything went wrong') {
                promise.reject({
                    fatal: true,
                    error: error
                });
            }
            else {
                promise.reject({
                    fatal: false,
                    error: error
                });
            }
        });

        return promise;
    }

    // This is the job finished handler. It is called either after the last step has been processed,
    // or after a step has errored in a fatal way.
    function jobFinished(job) {
        if (job.status === steppe.status.error) {
            console.error('Error: %s', job.error);
        }
        else {
            console.info('Job %s processed successfully', job.id);
        }
    }

    var Steppe = require('steppe');

    // One-time setup, at the start of your app.
    var steppe = new Steppe({
        db: {
            type: 'mongo',
            url: 'mongodb://localhost/testdb'
        },
    });

    // This defines a queue to create jobs in.
    steppe.defineQueue({
        name       : 'makePhotoAlbum',
        stepHandler: stepHandler,
        jobFinished: jobFinished,
        period     : 'every 20 seconds'
    });

    // Starts steppe. This means steppe will start looking for unfinished jobs
    // to process, for each queue that you have defined.
    steppe.start();

    // Now you can create jobs that will be handled.
    steppe.createJob({
        queueName: 'makePhotoAlbum',
        jobData: {
            url: 'http://photoalbums.example.net',
            auth_token: '1751FC0703C943D8904DAFCAD6F5814941CD1',
        },
        steps: [
            {
                action: 'createPhotoAlbum',
                stepData: {
                    albumName: 'My Pets',
                }
            },
            {
                action: 'uploadPhoto',
                stepData: {
                    filename: '/tmp/photo01.png',
                    description: 'My cat Mox',
                }
            },
            {
                action: 'uploadPhoto',
                stepData: {
                    filename: '/tmp/photo02.png'
                    description: 'My dog Iwan',
                }
            },
            {
                action: 'publishAlbum'
                stepData: { }
            }
        ]
    });
```
