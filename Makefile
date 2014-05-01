default: clean
	./node_modules/.bin/browserify lib/idb_observer.js --standalone IDBObserver > idb_observer.js

clean:
	rm idb_observer.js
