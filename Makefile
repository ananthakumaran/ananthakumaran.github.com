all: book-json book-covers

book-json:
	-mv ~/Downloads/goodreads_library_export.csv books.csv
	csvtojson books.csv | jq . > books.json
	echo "var books = $$(cat books.json)" > public/js/book-data.js

book-covers:
	node generate-covers.js
	git add books.csv books.json public/js/book-data.js public/covers
	git commit -m "update books"
	git push origin master

develop:
	bundle exec jekyll serve --livereload --drafts --host 0.0.0.0
