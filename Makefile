all: dist/satchel.js

release: dist/satchel.min.js

lint:
	./node_modules/.bin/eslint src/main.js

dist/satchel.js: src/main.js
	browserify $< > $@

dist/satchel.min.js: dist/satchel.js
	uglifyjs $< > $@

.PHONY: clean
clean:
	rm dist/*