DRE
=========

DRE means Data Regular Expressions.
It's a small JS library that helps to transform some data, including deeply nested structues, with a declarative expressions. It has very simple interface - one function, that accepts data to be transformed and expression, that describes how it should be done.
Consider the following basic example. Its a case when we need to transform an array of objects representions people, to an object containing their names, and a key should be an ID of each object.
```js
var people = [
		{
			name: 'Mykola',
			id: 37
		},
		{
			name: 'Ivan',
			id: 23
		},
		{
			name: 'Vadym',
			id: 45
		},
		{
			name: 'Petro',
			id: 2
		},
	];
	
	var people2 = dre(people, '$1>{$1.id: $1.name}');
	console.log(people2);// Object {2: "Petro", 23: "Ivan", 37: "Mykola", 45: "Vadym"} 
	
	
```

DRE eliminates the need to write nested loops, assing and fill object and array and so on.
An example with nested objects:

```js
    people = {
		men: [
			{
				name: 'Mykola',
				id: 37
			},
			{
				name: 'Sergii',
				id: 23
			},
			{
				name: 'Egor',
				id: 45
			},
		],
		women: [
			{
				name: 'Ira',
				id: 37
			},
			{
				name: 'Katya',
				id: 23
			},
			{
				name: 'Zhenya',
				id: 45
			},
			{
				name: 'Anya',
				id: 2
			},
			{
				name: 'Zosya',
				id: 47
			},
		],
	}
	
	var people3 = dre(people, '$1/$2>{$1.~: {list: {$2.id: $2.name}, number: ($2^)}}');
	
```

The result will be:

```js

{
    "men": {
        "number": 3,
        "list": {
            "23": "Sergii",
            "37": "Mykola",
            "45": "Egor"
        }
    },
    "women": {
        "number": 5,
        "list": {
            "2": "Anya",
            "23": "Katya",
            "37": "Ira",
            "45": "Zhenya",
            "47": "Zosya"
        }
    }
}

```

The syntax of the data regexps
----

Each expression contains of two parts, separated by > sign.
In first part we ddescribe how to go through our structure, and how to call it's levels.
In the second we describe, what we'd like to see as a result.
This will be described soon.

How it works
-----------

Dre generates a string and creates a Function with it. So it only takes some time to compile the expression on the first use, and than a compiled version is used. So, the overhead of using the library is very small.

Now I'm working on a lot of features for DRE, and I'll write the full documentation after it'll be finished.


