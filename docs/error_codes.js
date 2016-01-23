/*
 * There is scant information about what error codes MongoDB returns. This is an attempt to document some of them.
 */
var mongodb     = require('mongodb');
var MongoClient = mongodb.MongoClient;

MongoClient
    .connect("mongodb://localhost:27017/weert")
    .then(function (db) {
        // First, drop a non-existent collection
        db
            .dropCollection('foo')
            .then(function (result) {
                console.log("drop result=", result);
                // Prints nothing.
            })
            .catch(function (err) {
                console.log("drop err=", err);
                // Prints:
                //drop err= { [MongoError: ns not found]
                //name: 'MongoError',
                //    message: 'ns not found',
                //    ok: 0,
                //    errmsg: 'ns not found' }
            });

        // Now create a collection
        var bar = db.collection("bar");
        // Insert a simple document into it
        bar
            .insertOne({baz: 1})
            .then(function (result) {
                // Now delete the document, look at the results
                var id_obj = new mongodb.ObjectID(result.ops[0]._id);
                bar
                    .deleteOne({_id: {$eq: id_obj}}, {})
                    .then(function (result) {
                        console.log("delete result for good delete=", result.result)
                        // Prints:
                        //delete result for good delete= { ok: 1, n: 1 }
                    })
                    .catch(function (err) {
                        console.log("delete err for good delete=", err);
                        // Prints nothing
                    })
            });

        // Some random document _id
        var id_obj = new mongodb.ObjectID("569831245c3071de59fca350");

        // Attempt to delete the non-existent document, then look at the results
        bar
            .deleteOne({_id: {$eq: id_obj}}, {})
            .then(function (result) {
                console.log("delete result for bad delete=", result.result);
                // Prints:
                //delete result for bad delete= { ok: 1, n: 0 }
            })
            .catch(function (err) {
                console.log("delete err for bad delete=", err);
            });

        // Look for a non-existent collection
        db
            .collection("junk123", {strict: true}, function (err, result) {
                console.log("Look for non-existent collection error= ", err);
                // Prints:
                //Look for non-existent collection error=  { [MongoError: Collection junk123 does not exist. Currently in strict mode.]
                //name: 'MongoError',
                //    message: 'Collection junk123 does not exist. Currently in strict mode.',
                //    driver: true }
                console.log("Look for non-existent collection result=", result);
                // Prints:
                //Look for non-existent collection result= null
            });
    })
    .catch(function (err) {
        console.log("Error when connecting to mongo:", err);
        // If MongoDB is not running, this prints:
        //Error when connecting to mongo: { [MongoError: connect ECONNREFUSED 127.0.0.1:27017]
        //    name: 'MongoError',
        //        message: 'connect ECONNREFUSED 127.0.0.1:27017' }
    });
