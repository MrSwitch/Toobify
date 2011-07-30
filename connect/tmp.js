/**
 * connect.add
 * Add social network
 */
connect.add('???', new function(){

	var 
		
		// Event listeners
		listeners = [];
    

	/******************************************
	 * Onload 
	 * 
	 * What to trigger once this has been added to connect
	 ******************************************/

	this.init = function(callback){
		$.getScript('???', function(){
			
		});
	};

	/*************************************
	 *
	 *			Status Events
	 *
	 *************************************/
	this.subscribe = function(name, callback){
		listeners[name] = listeners[name] || [];
		listeners[name].push(callback);
	};
	function trigger(name,data){
		if(!(name in listeners)){return;}
		$.each(listeners[name], function(i,cb){
			cb(data);
		});
	}

	/*************************************
	 *
	 *			Authentication
	 *
	 *************************************/

	this.login = function(callback){
		
	};

	this.logout = function(callback){
		
	};

	/*************************************
	 *
	 *				GET
	 *
	 *************************************/

	this.get = function( service, callback ){


		switch(service){

			case 'profile': 
				
			break;
		


			case 'friends': 
		
			
			break;


			case 'comments': 
				
			break;



			case 'members': 
			break;

		}
	};


	/*************************************
	 *
	 *				POST
	 *
	 *************************************/
	this.post =  function( service, data, callback ){
		switch( service ){
			case "comment":

			break;
			case "message":
				
			break;
		}
	};
});