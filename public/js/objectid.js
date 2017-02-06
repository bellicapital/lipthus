function ObjectID(arg){
	if(!(this instanceof ObjectID))
		return new ObjectID(arg);

	if(arg && arg instanceof ObjectID)
		return arg;

	if(typeof arg === 'string'){
		if(arg.length!==12 && !ObjectID.isValid(arg))
			throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");
			
		this.str = arg;
	} else
		this.str = time2str();
}

/**
* Returns the generation date (accurate up to the second) that this ID was generated.
*
* @return {Date} the generation date
* @api public
*/
ObjectID.prototype.getTimestamp = function(){
	return new Date(parseInt(this.str.substr(0,8), 16) * 1000);
};

/**
* Return the ObjectID id as a 24 byte hex string representation
*
* @return {String} return the 24 byte hex string representation.
* @api public
*/
ObjectID.prototype.toHexString = function(){
    return this.str;
};

/**
* Compares the equality of this ObjectID with `otherID`.
*
* @param {Object} other ObjectID instance to compare against.
* @return {Boolean} the result of comparing two ObjectID's
* @api public
*/
ObjectID.prototype.equals = function (other){
	return !!other && this.str === other.toString();
};

/**
 * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
 *
 * @param {Number} time an integer number representing a number of seconds.
 * @return {ObjectID} return the created ObjectID
 * @api public
 */
ObjectID.createFromTime = function(time){
	return new ObjectID(time2str(time));
};

/**
 * Checks if a value is a valid bson ObjectId
 *
 * @param {String} objectid Can be a 24 byte hex string or an instance of ObjectID.
 * @return {Boolean} return true if the value is a valid bson ObjectID, return false otherwise.
 * @api public
 *
 * THE NATIVE DOCUMENTATION ISN'T CLEAR ON THIS GUY!
 * http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html#objectid-isvalid
 */
ObjectID.isValid = function(objectid) {
  if(!objectid) return false;

  //call .toString() to get the hex if we're
  // working with an instance of ObjectID
  return /^[0-9A-F]{24}$/i.test(objectid.toString());
};

function time2str(time){
	if(!time)
		time = new Date();
	
	if(time instanceof Date)
		time = time.getTime() / 1000 | 0;
	
	time = time.toString(16);
	
	return time + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
		return (Math.random() * 16 | 0).toString(16);
	}).toLowerCase();
}

 /**
 * Converts to a string representation of this Id.
 *
 * @return {String} return the 24 byte hex string representation.
 * @api private
 */
ObjectID.prototype.inspect = function (body) { return "ObjectID("+this+")"; };
ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
ObjectID.prototype.toString = ObjectID.prototype.toHexString;