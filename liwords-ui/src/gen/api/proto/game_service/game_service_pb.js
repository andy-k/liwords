// source: api/proto/game_service/game_service.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var api_proto_realtime_realtime_pb = require('../../../api/proto/realtime/realtime_pb.js');
goog.object.extend(proto, api_proto_realtime_realtime_pb);
var macondo_api_proto_macondo_macondo_pb = require('../../../macondo/api/proto/macondo/macondo_pb.js');
goog.object.extend(proto, macondo_api_proto_macondo_macondo_pb);
goog.exportSymbol('proto.game_service.GameInfoRequest', null, global);
goog.exportSymbol('proto.game_service.GameInfoResponse', null, global);
goog.exportSymbol('proto.game_service.PlayerInfo', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.game_service.GameInfoRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.game_service.GameInfoRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.game_service.GameInfoRequest.displayName = 'proto.game_service.GameInfoRequest';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.game_service.PlayerInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.game_service.PlayerInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.game_service.PlayerInfo.displayName = 'proto.game_service.PlayerInfo';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.game_service.GameInfoResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.game_service.GameInfoResponse.repeatedFields_, null);
};
goog.inherits(proto.game_service.GameInfoResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.game_service.GameInfoResponse.displayName = 'proto.game_service.GameInfoResponse';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.game_service.GameInfoRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.game_service.GameInfoRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.game_service.GameInfoRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.game_service.GameInfoRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    gameId: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.game_service.GameInfoRequest}
 */
proto.game_service.GameInfoRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.game_service.GameInfoRequest;
  return proto.game_service.GameInfoRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.game_service.GameInfoRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.game_service.GameInfoRequest}
 */
proto.game_service.GameInfoRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setGameId(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.game_service.GameInfoRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.game_service.GameInfoRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.game_service.GameInfoRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.game_service.GameInfoRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getGameId();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string game_id = 1;
 * @return {string}
 */
proto.game_service.GameInfoRequest.prototype.getGameId = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.GameInfoRequest} returns this
 */
proto.game_service.GameInfoRequest.prototype.setGameId = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.game_service.PlayerInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.game_service.PlayerInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.game_service.PlayerInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.game_service.PlayerInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    userId: jspb.Message.getFieldWithDefault(msg, 1, ""),
    nickname: jspb.Message.getFieldWithDefault(msg, 2, ""),
    fullName: jspb.Message.getFieldWithDefault(msg, 3, ""),
    countryCode: jspb.Message.getFieldWithDefault(msg, 4, ""),
    rating: jspb.Message.getFieldWithDefault(msg, 5, ""),
    title: jspb.Message.getFieldWithDefault(msg, 6, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.game_service.PlayerInfo}
 */
proto.game_service.PlayerInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.game_service.PlayerInfo;
  return proto.game_service.PlayerInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.game_service.PlayerInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.game_service.PlayerInfo}
 */
proto.game_service.PlayerInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setUserId(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNickname(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setFullName(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setCountryCode(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setRating(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.setTitle(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.game_service.PlayerInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.game_service.PlayerInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.game_service.PlayerInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.game_service.PlayerInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getUserId();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNickname();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getFullName();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getCountryCode();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getRating();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getTitle();
  if (f.length > 0) {
    writer.writeString(
      6,
      f
    );
  }
};


/**
 * optional string user_id = 1;
 * @return {string}
 */
proto.game_service.PlayerInfo.prototype.getUserId = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.PlayerInfo} returns this
 */
proto.game_service.PlayerInfo.prototype.setUserId = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string nickname = 2;
 * @return {string}
 */
proto.game_service.PlayerInfo.prototype.getNickname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.PlayerInfo} returns this
 */
proto.game_service.PlayerInfo.prototype.setNickname = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string full_name = 3;
 * @return {string}
 */
proto.game_service.PlayerInfo.prototype.getFullName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.PlayerInfo} returns this
 */
proto.game_service.PlayerInfo.prototype.setFullName = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string country_code = 4;
 * @return {string}
 */
proto.game_service.PlayerInfo.prototype.getCountryCode = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.PlayerInfo} returns this
 */
proto.game_service.PlayerInfo.prototype.setCountryCode = function(value) {
  return jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional string rating = 5;
 * @return {string}
 */
proto.game_service.PlayerInfo.prototype.getRating = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.PlayerInfo} returns this
 */
proto.game_service.PlayerInfo.prototype.setRating = function(value) {
  return jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * optional string title = 6;
 * @return {string}
 */
proto.game_service.PlayerInfo.prototype.getTitle = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 6, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.PlayerInfo} returns this
 */
proto.game_service.PlayerInfo.prototype.setTitle = function(value) {
  return jspb.Message.setProto3StringField(this, 6, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.game_service.GameInfoResponse.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.game_service.GameInfoResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.game_service.GameInfoResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.game_service.GameInfoResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.game_service.GameInfoResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    playersList: jspb.Message.toObjectList(msg.getPlayersList(),
    proto.game_service.PlayerInfo.toObject, includeInstance),
    lexicon: jspb.Message.getFieldWithDefault(msg, 2, ""),
    variant: jspb.Message.getFieldWithDefault(msg, 3, ""),
    timeControlName: jspb.Message.getFieldWithDefault(msg, 4, ""),
    timeControl: jspb.Message.getFieldWithDefault(msg, 5, ""),
    tournamentName: jspb.Message.getFieldWithDefault(msg, 6, ""),
    challengeRule: jspb.Message.getFieldWithDefault(msg, 7, 0),
    ratingMode: jspb.Message.getFieldWithDefault(msg, 8, 0),
    done: jspb.Message.getBooleanFieldWithDefault(msg, 9, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.game_service.GameInfoResponse}
 */
proto.game_service.GameInfoResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.game_service.GameInfoResponse;
  return proto.game_service.GameInfoResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.game_service.GameInfoResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.game_service.GameInfoResponse}
 */
proto.game_service.GameInfoResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.game_service.PlayerInfo;
      reader.readMessage(value,proto.game_service.PlayerInfo.deserializeBinaryFromReader);
      msg.addPlayers(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setLexicon(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setVariant(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setTimeControlName(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setTimeControl(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.setTournamentName(value);
      break;
    case 7:
      var value = /** @type {!proto.macondo.ChallengeRule} */ (reader.readEnum());
      msg.setChallengeRule(value);
      break;
    case 8:
      var value = /** @type {!proto.liwords.RatingMode} */ (reader.readEnum());
      msg.setRatingMode(value);
      break;
    case 9:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setDone(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.game_service.GameInfoResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.game_service.GameInfoResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.game_service.GameInfoResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.game_service.GameInfoResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getPlayersList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.game_service.PlayerInfo.serializeBinaryToWriter
    );
  }
  f = message.getLexicon();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getVariant();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getTimeControlName();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getTimeControl();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getTournamentName();
  if (f.length > 0) {
    writer.writeString(
      6,
      f
    );
  }
  f = message.getChallengeRule();
  if (f !== 0.0) {
    writer.writeEnum(
      7,
      f
    );
  }
  f = message.getRatingMode();
  if (f !== 0.0) {
    writer.writeEnum(
      8,
      f
    );
  }
  f = message.getDone();
  if (f) {
    writer.writeBool(
      9,
      f
    );
  }
};


/**
 * repeated PlayerInfo players = 1;
 * @return {!Array<!proto.game_service.PlayerInfo>}
 */
proto.game_service.GameInfoResponse.prototype.getPlayersList = function() {
  return /** @type{!Array<!proto.game_service.PlayerInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.game_service.PlayerInfo, 1));
};


/**
 * @param {!Array<!proto.game_service.PlayerInfo>} value
 * @return {!proto.game_service.GameInfoResponse} returns this
*/
proto.game_service.GameInfoResponse.prototype.setPlayersList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.game_service.PlayerInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.game_service.PlayerInfo}
 */
proto.game_service.GameInfoResponse.prototype.addPlayers = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.game_service.PlayerInfo, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.clearPlayersList = function() {
  return this.setPlayersList([]);
};


/**
 * optional string lexicon = 2;
 * @return {string}
 */
proto.game_service.GameInfoResponse.prototype.getLexicon = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setLexicon = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string variant = 3;
 * @return {string}
 */
proto.game_service.GameInfoResponse.prototype.getVariant = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setVariant = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string time_control_name = 4;
 * @return {string}
 */
proto.game_service.GameInfoResponse.prototype.getTimeControlName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setTimeControlName = function(value) {
  return jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional string time_control = 5;
 * @return {string}
 */
proto.game_service.GameInfoResponse.prototype.getTimeControl = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setTimeControl = function(value) {
  return jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * optional string tournament_name = 6;
 * @return {string}
 */
proto.game_service.GameInfoResponse.prototype.getTournamentName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 6, ""));
};


/**
 * @param {string} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setTournamentName = function(value) {
  return jspb.Message.setProto3StringField(this, 6, value);
};


/**
 * optional macondo.ChallengeRule challenge_rule = 7;
 * @return {!proto.macondo.ChallengeRule}
 */
proto.game_service.GameInfoResponse.prototype.getChallengeRule = function() {
  return /** @type {!proto.macondo.ChallengeRule} */ (jspb.Message.getFieldWithDefault(this, 7, 0));
};


/**
 * @param {!proto.macondo.ChallengeRule} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setChallengeRule = function(value) {
  return jspb.Message.setProto3EnumField(this, 7, value);
};


/**
 * optional liwords.RatingMode rating_mode = 8;
 * @return {!proto.liwords.RatingMode}
 */
proto.game_service.GameInfoResponse.prototype.getRatingMode = function() {
  return /** @type {!proto.liwords.RatingMode} */ (jspb.Message.getFieldWithDefault(this, 8, 0));
};


/**
 * @param {!proto.liwords.RatingMode} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setRatingMode = function(value) {
  return jspb.Message.setProto3EnumField(this, 8, value);
};


/**
 * optional bool done = 9;
 * @return {boolean}
 */
proto.game_service.GameInfoResponse.prototype.getDone = function() {
  return /** @type {boolean} */ (jspb.Message.getBooleanFieldWithDefault(this, 9, false));
};


/**
 * @param {boolean} value
 * @return {!proto.game_service.GameInfoResponse} returns this
 */
proto.game_service.GameInfoResponse.prototype.setDone = function(value) {
  return jspb.Message.setProto3BooleanField(this, 9, value);
};


goog.object.extend(exports, proto.game_service);
