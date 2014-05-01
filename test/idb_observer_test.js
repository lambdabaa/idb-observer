describe('IDBObserver', function() {
  var subject, db;

  var names = [
    'Amy',
    'Barry',
    'Caitlin',
    'Daniel',
    'Eric',
    'Frank',
    'Guy',
    'Heather'
  ];

  before(function(done) {
    indexedDB.deleteDatabase('test').onsuccess = function() {
      done();
    };
  });

  before(function(done) {
    indexedDB.open('test', 1).onupgradeneeded = function(event) {
      db = event.target.result;
      var objectStore = db.createObjectStore('people', { keyPath: 'name' });
      objectStore.transaction.oncomplete = function() {
        var transaction = db.transaction('people', 'readwrite');
        transaction.oncomplete = function() {
          done();
        };

        var peopleStore = transaction.objectStore('people');
        names.forEach(function(name) {
          peopleStore.add({ name: name });
        });
      };
    };
  });

  beforeEach(function() {
    subject = new IDBObserver();
    subject.start();
  });

  afterEach(function() {
    subject.stop();
  });

  describe('#subscribe', function() {
    it('should return a promise fulfilled with result', function() {
      var subscription = subject.subscribe(function() {
        var transaction = db.transaction('people', 'readonly');
        var peopleStore = transaction.objectStore('people');
        return peopleStore.mozGetAll();
      });

      return subscription
        .then(function(result) {
          assert.isArray(result.value);
          assert.lengthOf(result.value, names.length);
        });
    });

    it('should update in realtime', function(done) {
      var subscription = subject.subscribe(function() {
        var transaction = db.transaction('people', 'readonly');
        var peopleStore = transaction.objectStore('people');
        return peopleStore.mozGetAll();
      });

      return subscription
        .then(function(result) {
          assert.include(result.value.map(function(person) {
            return person.name;
          }), 'Amy');

          // Remove Amy from the people store.
          var transaction = db.transaction('people', 'readwrite');
          var peopleStore = transaction.objectStore('people');
          var remove = peopleStore.delete('Amy');
          remove.onsuccess = function() {
            waitFor(function() {
              // Our "subscription" should be updated to note
              // that Amy was removed from the people store.
              return result.value.every(function(person) {
                return person.name !== 'Amy';
              });
            }, done);
          };
          remove.onerror = done;
        });
    });
  });
});

function waitFor(predicate, callback) {
  var truthy = predicate();
  if (!truthy) {
    var next = waitFor.bind(this, predicate, callback);
    return setTimeout(next, 100);
  }

  callback();
}
