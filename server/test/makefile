SERVER=http://localhost:3000

all: test-clean test

ifndef TEST_SUITE
TEST_SUITE=`find * -name "*_test.yaml"`
endif
test:
	@rm test-results
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

