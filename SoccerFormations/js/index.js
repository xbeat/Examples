'use strict';

var formation = [
	[5, 4, 1],
	[4, 5, 1],
	[4, 4, 2],
	[4, 4, 1, 1],
	[4, 3, 3],
	[4, 3, 2],
	[4, 2, 3, 1],
	[4, 2, 2, 2],
	[4, 2, 1, 3],
	[4, 2, 4, 1],
	[4, 1, 3, 2],
	[4, 1, 2, 3],
	[3, 5, 2, 2],
	[3, 5, 1, 1],
	[3, 4, 1, 2],
	[3, 4, 3],
	[3, 4, 2, 1]
];

for ( let i = 0; i < formation.length; i++ ){

	let blockContainer = document.createElement( "div" );
	blockContainer.classList.add( "blockContainer" );
	document.getElementById("formation").appendChild( blockContainer );

	let formationText = document.createElement( "div" );
	formationText.classList.add( "formationText" );
	blockContainer.appendChild( formationText );
	
	let formationBlock = document.createElement( "div" );
	formationBlock.classList.add( "formationBlock" );
	blockContainer.appendChild( formationBlock );
	
	let text = "";

	for ( let j = 0; j < formation[ i ].length; j++ ){	
		var formationRow = document.createElement( "div" );
		formationRow.classList.add( "formationRow" );
		text = text + " " + formation[ i ][ j ];
		formationBlock.appendChild( formationRow );

		for ( let p = 0; p < formation[ i ][ j ]; p++ ){
			var playerDisplay = document.createElement( "div" );
			playerDisplay.classList.add( "formationPlayerSmall" )
			formationRow.appendChild( playerDisplay );
		};	
	};

	formationText.innerText = text;
	formationBlock.setAttribute( 'data-id', i );

	formationBlock.addEventListener( "click", function( ev ){
		let selectedFormation = ev.currentTarget.getAttribute( "data-id" );
		[].forEach.call( document.querySelectorAll( '.formationBlock' ), function ( el, indexElem ) {
			el.style.border = "1px solid transparent";
		});
		this.style.border = "1px solid #38B87c";
	});

};