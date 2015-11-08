SERVER=http://localhost:3000

all: help

help:
	@echo "options include:"
	@echo "          test  run all unit tests"
	@echo "                TEST_SUITE=path/to/foo.py to run only foo tests"

ifndef TEST_SUITE
TEST_SUITE=`find server -name "test_*.yaml"`
endif

test: test-clean
	@rm -f test-results
	@for f in $(TEST_SUITE); do \
  echo running $$f; \
  echo $$f >> test-results; \
  resttest.py $(SERVER) $$f >> test-results 2>&1; \
  echo >> test-results; \
done
	@echo "see test-results"


MONGOCLEAN="use weert;\n\
db.dropDatabase();\n"
test-clean:
	echo $(MONGOCLEAN) | mongo >/dev/null 2>&1












