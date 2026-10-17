.PHONY: all book-json book-covers book-colors book-mockups vendor-tooltips commit develop

all: commit

book-json:
	@if [ -f "$(HOME)/Downloads/goodreads_library_export.csv" ]; then mv "$(HOME)/Downloads/goodreads_library_export.csv" books.csv; fi
	csvtojson books.csv | jq . > books.json
	echo "var books = $$(cat books.json)" > public/js/book-data.js

book-covers: book-json
	node generate-covers.js
	node generate-spine-colors.js
	node generate-book-mockups.js

book-colors:
	node generate-spine-colors.js

book-mockups:
	node generate-book-mockups.js $(ARGS)

vendor-tooltips:
	node vendor-tooltips.js

commit: book-covers
	@git diff --cached --quiet || { echo "Existing staged changes: commit or unstage them before updating books." >&2; exit 1; }
	git add -- books.csv books.json public/js/book-data.js 'public/covers/*.jpg' 'public/covers/*.webp'
	@if git diff --cached --quiet; then \
		echo "No book updates to commit."; \
	else \
		git commit -m "update books" && git push origin master; \
	fi

develop:
	bundle exec jekyll serve --livereload --drafts --host 0.0.0.0
