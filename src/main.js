(function() {

    'use strict';

    const elConnect = document.querySelector('#connect');
    const elDisconnect = document.querySelector('#disconnect');

    // 200, 202
    const weatherServiceUUID  = 'ef680400-9b35-4933-9b10-52ffa9740042';
    const pressureCharUUID    = 'ef68040a-9b35-4933-9b10-52ffa9740042';

    let tempDevice;
    let tempService;
    let pressureCharacteristic;

    function parseTemperature(data) {
        data = data.buffer ? data : new DataView(data);
        let temp = data.getUint16(12, /*littleEndian=*/true);
        return (temp / 20) - 615;
    };

    function onPressureChanged(event) {
        console.log('onPressureChanged' + event.target.value);
        let data = event.target.value;
        data = data.buffer ? data : new DataView(data);
        //let pressureInt = data.getInt32(0,
        //let pressureDec = data.getUint8(4, /*littleEndian=*/true);
        //let mult = Math.pow(2, -16);
        let mult = 1;
        let x = mult * data.getFloat32(0, /*littleEndian=*/true);
        let y = mult * data.getFloat32(4, /*littleEndian=*/true);
        let z = mult * data.getFloat32(8, /*littleEndian=*/true);

        //console.log('pressureInt: ' + pressureInt);
        //console.log('pressureDec: ' + pressureDec);
        console.log('x: ' + x);
        console.log('y: ' + y);
        console.log('z: ' + z);
    };

    let lastTemps = [];
    let notificationCounter = 0;

    function updateTemperature(temp) {
	const keep = 2;
	lastTemps[notificationCounter % keep] = temp;
	notificationCounter++;
	let tempToShow = 0;
	if (notificationCounter === 1) {
	    tempToShow = temp;
	} else if (notificationCounter % keep === 0) {
	    tempToShow = lastTemps.reduce((a, b) => a + b, 0) / keep;
	}

	if (tempToShow != 0) {
	    elTemperature.innerHTML = tempToShow.toFixed(1) + ' &#8451;';
	}
    }

    function onDisconnected(event) {
	console.log('Disconnected event received.');
	reconnect();
    }

    function reconnect() {
	if (!tempDevice || tempDevice.gatt.connected) {
	    return;
	}
	setTimeout(function() {
	    console.log('Reconnecting...');
	    connect()
		.catch(error => {
		    console.log('Argh! Failed to reconnect: ' + error);
		});
	}, 20000);
    }

    function connect() {
        console.log('connect()');
	return tempDevice.gatt.connect()
	    .then(server => {
                console.log('Got server');
                return server.getPrimaryService(weatherServiceUUID);
            })
            .then(service => {
                console.log('Got service');
                tempService = service;
                return tempService.getCharacteristic(pressureCharUUID);
            })
            .then(characteristic => {
                console.log('Got pressure characteristic');
                pressureCharacteristic = characteristic;
		console.log('> Characteristic UUID:  ' + characteristic.uuid);
		console.log('> Broadcast:            ' + characteristic.properties.broadcast);
		console.log('> Read:                 ' + characteristic.properties.read);
		console.log('> Write w/o response:   ' + characteristic.properties.writeWithoutResponse);
		console.log('> Write:                ' + characteristic.properties.write);
		console.log('> Notify:               ' + characteristic.properties.notify);
		console.log('> Indicate:             ' + characteristic.properties.indicate);
		console.log('> Signed Write:         ' + characteristic.properties.authenticatedSignedWrites);
		console.log('> Queued Write:         ' + characteristic.properties.reliableWrite);
		console.log('> Writable Auxiliaries: ' + characteristic.properties.writableAuxiliaries);
                console.log('Getting sensor characteristic');
                console.log('Starting notifications');
                return pressureCharacteristic.startNotifications();
	    })
            .then(() => {
                console.log('Started notifications');
                pressureCharacteristic.addEventListener('characteristicvaluechanged', onPressureChanged);
            });
    }

    function scan() {
        if (!navigator.bluetooth) {
            console.log('Web Bluetooth API is not available.\n' +
                        'Please make sure the Web Bluetooth flag is enabled.');
            return;
        }

        console.log('Connecting to Thingy:52');

        navigator.bluetooth.requestDevice({
            'filters': [{ name: ['Thingy'] }],
            'optionalServices': [
                weatherServiceUUID
            ]
        })
            .then(device => {
                console.log('Got device: ' + device.name);
                tempDevice = device;
		device.addEventListener('gattserverdisconnected', onDisconnected);
		return connect();
            })
            .catch(exception => {
                console.log('Argh! ' + exception);
            });
    };

    elConnect.onclick = function() {
        scan();
    };

    elDisconnect.onclick = function() {
        console.log('disconnect clicked. gatt.connected? ' + tempDevice.gatt.connected);
        if (tempDevice.gatt.connected) {
            tempDevice.gatt.disconnect();
            updateTemperature('--');
        }
    };

}());
