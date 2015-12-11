# Steppe - a simply queueing system for linear jobs

## OUTDATED!

This is outdated documentation. Please do not use this module yet.

```
    var Steppe = require('steppe');
    var steppe = new Steppe({
        db: {
            type: 'mongo',
            uri: 'mongodb://localhost/testdb'
        },

    });

    // One-time setup, at the start of your app.

    // The function that handles a step returns a promise to indicate
    // whether the step has been handled successfully or not.
    function handleStep(data) {
        var stepData = data.stepData; // The data of this specific step.
        var jobData  = data.jobData;  // The data of the job. The same for each step.
        var action   = data.action;   // The action of the step.

        // Generate a promise with your favourite promise library.
        var promise = createPromise();

        // Perform your
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

    // This function is called either after the last child has been processed,
    // or after a child has errored in a fatal way.
    function handleParent(parentData) {
        if (parentData.status === steppe.status.error) {
            console.error('Error: %s', parentData.error);
        }
        else {
            console.info('Parent %s processed successfully', parentData.id);
        }
    }

    steppe.defineQueue({
        name       : 'makePhotoAlbum',
        stepHandler: handleStep,
        jobFinished: jobFinished,
        period     : 'every 20 seconds'
    });

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
