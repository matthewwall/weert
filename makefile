SERVER=http://localhost:3000

all: help

help:
	@echo "options include:"
	@echo "          test  run all unit tests"


test: test-clean
	@rm -f test-results
	@jasmine-node server
	@echo "see test-results"


MONGOCLEAN="use weert;\n\
db.dropDatabase();\n"
test-clean:
	echo $(MONGOCLEAN) | mongo >/dev/null 2>&1












