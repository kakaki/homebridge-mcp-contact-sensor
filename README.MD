# MCP Contact and Motions Sensors

A Homebridge Plugin for controlling your contact and motions sensors using chip mcp23017 port extender for Pi.

The setup is pretty straight forward. All you need is a raspberry pi  running [homebridge](https://github.com/nfarina/homebridge). Chip(s) mcp23017 connected to i2c.

#### Install via npm (>= v8.x.x)
`npm install ## homebridge-mcp-contact-sensor -g`


#### Edit the ./homebridge/config.json
You don't need that much to get started. Just set used i2c address(es) and in pins select multiple items with address, port (A, B) and used pin (0-7) for each device, add kind "motion" for motion sensor and empty for contact sensor.
Can add up to 16 devices with one mcp23017 chip, connect another for next 16 devices.

```
"platforms": [
	{
		"platform": "mcpSensors",
		"name": "mcpSensors20",
		"addresses": ["0x20", "0x21"],
		"updateInterval": 500,
		"pins": [
			{
			"address": "0x20",
			"port": "A",
			"pin": 0,
			"name": "Contact Sensor"
			},
			{
			"address": "0x21",
			"port": "B",
			"pin": 0,
			"name": "Motion",
			"kind": "motion"
			}
		]
	}
]
```

#### Misc
Feel free to give me feedback, create PRs or submit issues, enhancements and bugs.