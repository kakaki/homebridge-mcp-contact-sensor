var 
  i2c = require('i2c-bus'),
  i2c1 = i2c.openSync(1);

var 
  IODIRA = 0x00,
  IODIRB = 0x01,
  OLATA  = 0x14,
  OLATB  = 0x15, 
  GPIOA  = 0x12,
  GPIOB  = 0x13,
  GPPUA  = 0x0C,
  GPPUB  = 0x0D;

let Accessory, Service, Characteristic, UUIDGen;

module.exports = (homebridge) => {
  
  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;
  
  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform('homebridge-mcp-sensors-platform', 'mcpSensors', mcpSensorsPlatform, true);
};

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function mcpSensorsPlatform(log, config, api) {
	this.log = log;
	this.config = config;
	this.accessories = [];

	this.name = config.name;
	this.addresses = config.addresses || ['0x20'];
//	this.address = parseInt(config.address, 16);
	this.updateInterval = config.updateInterval || 1000;

	this.pins = config.pins || {};
	this.states = {};

	for (var a in this.addresses) {
		var adr = this.addresses[a];
		this.states[adr] = ["", ""];
	}

	if (api) {
    	this.api = api;
	    this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
  	}
}    
    
// Method to restore accessories from cache
mcpSensorsPlatform.prototype.configureAccessory = function (accessory) {
  this.log("config accessory: " + accessory.context.name + "'...");
	
  this.setService(accessory);
  this.accessories[accessory.context.name] = accessory;
}    
    
// Method to setup accesories from config.json
mcpSensorsPlatform.prototype.didFinishLaunching = function () {
  this.log("Platform didFinishLaunching: " + this.pins + "'...");
  // Add or update accessories defined in config.json
  for (var i in this.pins) this.addAccessory(this.pins[i]);

  this.log("Platform remove old accesories");

  // Remove extra accessories in cache
  for (var name in this.accessories) {
    var accessory = this.accessories[name];
    if (!accessory.reachable) this.removeAccessory(accessory);
  }

  this.log("Platform init i2c");
  
  for (var a in this.addresses) {
  	this.log("init adres: " + this.addresses[a] + " ...");
	this.address = parseInt(this.addresses[a], 16);
    
	i2c1.writeByteSync(this.address, IODIRA, 0xFF);
	i2c1.writeByteSync(this.address, OLATA,  0x00);  
	i2c1.writeByteSync(this.address, GPPUA,  0xFF);  

	i2c1.writeByteSync(this.address, IODIRB, 0xFF);  
	i2c1.writeByteSync(this.address, OLATB,  0x00); 
	i2c1.writeByteSync(this.address, GPPUB,  0xFF); 
	}
    
    setInterval(function(sensors) {
	    for (var a in sensors.addresses) {
			sensors.address = parseInt(sensors.addresses[a], 16);
			
			sensors.lastStateA = sensors.states[sensors.addresses[a]][0];
			sensors.lastStateB = sensors.states[sensors.addresses[a]][1];

			sensors.stateA = i2c1.readByteSync(sensors.address, GPIOA);
			sensors.stateB = i2c1.readByteSync(sensors.address, GPIOB);
			
//			console.log('MCP read: ' + sensors.address.toString(16) +' PIN A: ' + sensors.stateA.toString(2)+' last: '+ sensors.lastStateA.toString(2));
//			console.log('MCP read: ' + sensors.address.toString(16) +' PIN B: ' + sensors.stateB.toString(2)+' last: '+ sensors.lastStateB.toString(2));
		
			if (sensors.lastStateA!=sensors.stateA) {		
				console.log('MCP - ' + sensors.address.toString(16) +' change on PIN A: ' + sensors.stateA.toString(2)+' last: '+ sensors.lastStateA.toString(2));
			}
			if (sensors.lastStateB!=sensors.stateB) {
				console.log('MCP - ' + sensors.address.toString(16) +' change on PIN B: ' + sensors.stateB.toString(2)+' last: '+ sensors.lastStateB.toString(2));
			}

			for (var i in sensors.pins) {			
				var state ='';
				var update=false;
				if (sensors.pins[i].address==sensors.address) {
					if (sensors.pins[i].port=='A') {
						state=sensors.stateA;
						update=sensors.lastStateA!=sensors.stateA;
					}
					else {
						state=sensors.stateB;
						update=sensors.lastStateB!=sensors.stateB;
					}
			
					if (update) {

						var pinInt = Math.pow(2, sensors.pins[i].pin);
						var pinState = (state & pinInt) != 0;
					
//						console.log('MCP - update ' +sensors.address.toString(16) +' '+sensors.pins[i].port+ sensors.pins[i].pin + ' '+pinInt.toString()+' '+pinState.toString()+' '+state.toString(2)); 																			
							
						  var accessory = sensors.accessories[sensors.pins[i].name];
						  if (accessory) {			  
						  
							  if (sensors.pins[i].kind=='motion') {
								accessory.getService(Service.MotionSensor)
									.getCharacteristic(Characteristic.MotionDetected)
									.setValue(pinState);
							  }
							  else 
								accessory.getService(Service.ContactSensor)
									.getCharacteristic(Characteristic.ContactSensorState)
									.setValue(pinState);
							}			
						}		
					}
				}
			
			sensors.states[sensors.addresses[a]][0] = sensors.stateA;
			sensors.states[sensors.addresses[a]][1] = sensors.stateB;					
		}
	      	
	}, this.updateInterval, this);
}

// Method to add and update HomeKit accessories
mcpSensorsPlatform.prototype.addAccessory = function (data) {
  this.log("Initializing platform accessory '" + data.name + "'...");

  // Retrieve accessory from cache
  var accessory = this.accessories[data.name];

  if (!accessory) {
    this.log("creating accessory '" + data.name + "'...");
    
    // Setup accessory as SWITCH (8) category.
    var uuid = UUIDGen.generate(data.name);    
    accessory = new Accessory(data.name, uuid, 10);

    if (data.kind=='motion') {
        this.log("setting MotionSensor for '" + data.name + "'...");
	    accessory.addService(Service.MotionSensor, data.name);
	}
	else  {
		this.log("setting ContactSensor for '" + data.name + "'...");
	    accessory.addService(Service.ContactSensor, data.name);
	}

    // New accessory is always reachable
    accessory.reachable = true;

    // Setup listeners for different switch events
    this.setService(accessory);

    // Register new accessory in HomeKit
    this.api.registerPlatformAccessories("homebridge-mcp-sensors-platform", "mcpSensors", [accessory]);

    // Store accessory in cache
    this.accessories[data.name] = accessory;
  }

  if (data.manufacturer) data.manufacturer = data.manufacturer.toString();
  if (data.model) data.model = data.model.toString();
  if (data.serial) data.serial = data.serial.toString();

  // Store and initialize variables into context
  var cache = accessory.context;
  cache.name = data.name;
  cache.port = data.port;
  cache.pin = data.pin;

  // Retrieve initial state
  this.getInitState(accessory);
}

// Method to remove accessories from HomeKit
mcpSensorsPlatform.prototype.removeAccessory = function (accessory) {
  if (accessory) {
    var name = accessory.context.name;
    this.log(name + " is removed from HomeBridge.");
    this.api.unregisterPlatformAccessories("homebridge-mcp-sensors-platform", "mcpSensors", [accessory]);
    delete this.accessories[name];
  }
}

// Method to setup listeners for different events
mcpSensorsPlatform.prototype.setService = function (accessory) {
//  accessory.getService(Service.ContactSensor)
//  .getCharacteristic(Characteristic.ContactSensorState)
//  .setValue(false);
//    .on('get', this.getPowerState.bind(this, accessory.context))
//    .on('set', this.setPowerState.bind(this, accessory.context));

  accessory.on('identify', this.identify.bind(this, accessory.context));
}

// Method to retrieve initial state
mcpSensorsPlatform.prototype.getInitState = function (accessory) {
  var manufacturer = accessory.context.manufacturer || "MCP-kakaki";
  var model = accessory.context.model || "MCP-Contact";
  var serial = accessory.context.serial || "123-456";

  // Update HomeKit accessory information
  accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, manufacturer)
    .setCharacteristic(Characteristic.Model, model)
    .setCharacteristic(Characteristic.SerialNumber, serial);

  // Configured accessory is reachable
  accessory.updateReachability(true);
}

// Method to handle identify request
mcpSensorsPlatform.prototype.identify = function (thisSwitch, paired, callback) {
  this.log(thisSwitch.name + " identify requested!");
  callback();
}