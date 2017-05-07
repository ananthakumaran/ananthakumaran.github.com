all: book-json book-covers

book-json:
	csvtojson books.csv | jq . > books.json
	echo "var books = $$(cat books.json)" > public/js/book-data.js

book-covers:
	node generate-covers.js
