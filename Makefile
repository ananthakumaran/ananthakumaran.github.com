book-json:
	csvtojson books.csv | jq . > books.json

book-covers:
	node generate-covers.js
