import { useState } from "react";

import logo from "./logo.svg";
import "./App.css";

/**
 * https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
 */
function parseHeartRate(value) {
	// In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
	value = value.buffer ? value : new DataView(value);
	let flags = value.getUint8(0);
	let rate16Bits = flags & 0x1;
	let result = {};
	let index = 1;
	if (rate16Bits) {
		result.heartRate = value.getUint16(index, /*littleEndian=*/ true);
		index += 2;
	} else {
		result.heartRate = value.getUint8(index);
		index += 1;
	}
	let contactDetected = flags & 0x2;
	let contactSensorPresent = flags & 0x4;
	if (contactSensorPresent) {
		result.contactDetected = !!contactDetected;
	}
	let energyPresent = flags & 0x8;
	if (energyPresent) {
		result.energyExpended = value.getUint16(index, /*littleEndian=*/ true);
		index += 2;
	}
	let rrIntervalPresent = flags & 0x10;
	if (rrIntervalPresent) {
		let rrIntervals = [];
		for (; index + 1 < value.byteLength; index += 2) {
			rrIntervals.push(value.getUint16(index, /*littleEndian=*/ true));
		}
		result.rrIntervals = rrIntervals;
	}
	return result;
}

function App() {
	const [device, setDevice] = useState(null);
	const [heartRate, setHeartRate] = useState(null);

	const askForBlueToothDevices = () => {
		// console.log("ask for bluetooth devices");

		const handleHeartRateNotification = (event) => {
			const value = event.target.value;

			setHeartRate(parseHeartRate(event.target.value).heartRate);
		};

		navigator.bluetooth
			.requestDevice({ filters: [{ services: ["heart_rate"] }] })
			.then((bluetoothDevice) => {
				setDevice(bluetoothDevice);

				// Set up event listener for when device gets disconnected.
				bluetoothDevice.addEventListener(
					"gattserverdisconnected",
					onDisconnected
				);

				// Human-readable name of the device.
				// console.log(bluetoothDevice.name);

				// Attempts to connect to remote GATT Server.
				return bluetoothDevice.gatt.connect();
			})
			.then((server) => server.getPrimaryService("heart_rate"))
			.then((service) => service.getCharacteristic("heart_rate_measurement"))
			.then((characteristic) => characteristic.startNotifications())
			.then((characteristic) => {
				characteristic.addEventListener(
					"characteristicvaluechanged",
					handleHeartRateNotification
				);
				// console.log("Notifications have been started.");
			})
			// .then((service) => {
			// 	console.log(
			// 		"Getting Heart Rate Control Point Characteristic...",
			// 		service
			// 	);
			// 	return service.getCharacteristic("heart_rate_control_point");
			// })
			// .then((characteristic) => {
			// 	console.log("Writing Heart Rate Control Point Characteristic...");

			// 	// Writing 1 is the signal to reset energy expended.
			// 	let resetEnergyExpended = Uint8Array.of(1);
			// 	return characteristic.writeValue(resetEnergyExpended);
			// })
			// .then((_) => {
			// 	console.log("> Energy expended has been reset.");
			// })
			// .then((server) => {
			// 	console.log({ server });
			// })
			.catch((error) => {
				console.error(error);
			});
	};

	function onDisconnected(event) {
		const device = event.target;
		// console.log(`Device ${device.name} is disconnected.`);
		setDevice(null);
	}

	const handleDisconnect = () => {
		device.gatt.disconnect();
		setDevice(null);
	};

	return (
		<div className="App">
			<button onClick={askForBlueToothDevices}>
				Connect to a bluetooth device
			</button>
			{/* <p>{device ? JSON.stringify(device) : "no bluetooth device connected"}</p> */}

			{heartRate && (
				<div
					style={{
						fontSize: 30,
						border: "2px solid black",
						padding: "3rem",
						marginInline: "1rem",
						marginBlock: "3rem",
					}}
				>
					{heartRate}
				</div>
			)}

			{device && <button onClick={handleDisconnect}>Disconnect</button>}
		</div>
	);
}

export default App;
