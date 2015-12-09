# Marble - a simply queueing system for linear jobs

## OUTDATED!

This is outdated documentation. Please do not use this module yet. It will soon be available on npm.

```
    var Marble = require('marble');
    var marble = new Marble();

    marble.configure({
        db: {
            type: 'mongo',
            uri: 'mongodb://localhost/testdb'
        },

    });

    // This function returns a promise.
    function handleChild(childData, parentData) {
        // Generate a promise with your favourite promise library.
        var promise = ...;

        doStuff(childData, parentData)
        .then(function(result) {
            promise.resolve(result);
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
        if (parentData.status === marble.status.error) {
            console.error('Error: %s', parentData.error);
        }
        else {
            console.info('Parent %s processed successfully', parentData.id);
        }
    }

    marble.defineQueue({
        name         : 'makePhotoAlbum',
        parentHandler: handleParent,
        childHandler : handleChild,
        period       : 'every 20 seconds'
    });

    marble.start();

    marble.createJob({
        queueName: 'makePhotoAlbum',
        parent: {
            url: 'http://photoalbums.example.net',
            auth_token: '1751FC0703C943D8904DAFCAD6F5814941CD1',
        },
        children: [
            {
                type: 'createPhotoAlbum',
                albumName: 'My Pets',
            },
            {
                type: 'uploadPhoto',
                filename: '/tmp/photo01.png',
                description: 'my cat',
            },
            {
                type: 'uploadPhoto',
                filename: '/tmp/photo02.png'
                description: 'my dog',
            },
            {
                type: 'publishAlbum'
            }
        ]
    });

