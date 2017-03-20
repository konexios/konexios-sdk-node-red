const mqtt = require('mqtt');

module.exports = function(RED) {

    const TOPIC_PREFIX = 'krs.tel.gts.';
    const TOPIC_PREFIX_BATCH = 'krs.tel.bat.gts.';

    function AcnMqttNode(config) {
        let node = this;
        RED.nodes.createNode(node, config);

        let closed = false;
        let apikey = node.credentials && node.credentials.apikey;
        let {url, prefix, gateway, device} = config;
        if (!url || !apikey || !prefix || !gateway || !device) {
            node.error(`configuration error: url=${url}, apikey=${apikey}, prefix=${prefix}, gateway=${gateway}, device=${device}`);
            node.status({fill:'red',shape:'ring',text:'configuration error'});
            return;
        }

        let username = prefix + ':' + gateway;
        let client;
        function connect() {
            node.log(`connecting to ${url}`);
            node.status({fill:'grey',shape:'ring',text:'connecting'});
            client = mqtt.connect(url, {
                username,
                password: apikey
            });
            client.on('connect',function() {
                if (!closed) {
                    node.log(`connected to ${url}`);
                    node.status({fill:'green',shape:'dot',text:'connected'});
                }
            });
            client.on('reconnect',function() {
                if (!closed) {
                    node.warn(`reconnecting to ${url}`);
                    node.status({fill:'yellow',shape:'dot',text:'reconnecting'});
                }
            });
            client.on('close',function() {
                if (!closed) {
                    node.error(`disconnected from ${url}`);
                    node.status({fill:'red',shape:'ring',text:'disconnected'});
                }
            });
            client.on('offline',function() {
                if (!closed) {
                    node.error('client offline');
                    node.status({fill:'red',shape:'ring',text:'client offline'});
                }
            });
            client.on('error', function(err) {
                if (!closed) {
                    node.error(`error connecting to ${url}`);
                    node.status({fill:'red',shape:'ring',text:'error'});
                }
            });
        }
        connect();

        function addTypeInfo(payload) {
            let result = {};
            if (payload != null && typeof payload == 'object') {
                Object.keys(payload).forEach(key => {
                    if (typeof key != 'string') return;
                    if (!payload.hasOwnProperty(key)) return;
                    let value = payload[key];
                    if (value == null) return; // ignore null and undefined
                    if (typeof value != 'boolean' && typeof value != 'number' && typeof value != 'string') {
                        // convert value to string
                        value = JSON.stringify(value);
                    }
                    if (/^(_|s|i|f|b|d|dt|i2|i3|f2|f3|bi)\|/.test(key)) {
                        // type info present, just copy
                        result[key] = value;
                    } else {
                        // guess by value type
                        if (typeof value == 'boolean') {
                            result['b|'+key] = value;
                        } else if (typeof value == 'number') {
                            if (Number.isSafeInteger(value)) {
                                result['i|'+key] = value;
                            } else {
                                result['f|'+key] = value;
                            }
                        } else if (typeof value == 'string') {
                            result['s|'+key] = value;
                        } else {
                            // should never be here since any other type is stringified
                            node.error(`Unknown type of value=${value}`);
                        }
                    }
                });
            }
            if (Object.keys(result).length == 0) {
                node.warn('Empty payload');
            }
            // make sure system properties are set
            result['_|deviceHid'] = result['_|deviceHid'] || device;
            result['_|timestamp'] = result['_|timestamp'] || Date.now();
            return result;
        }

        node.on('input', function(msg) {
            if (!closed && client && msg) {
                if (msg.payload != null && typeof msg.payload == 'object') {
                    if (Array.isArray(msg.payload)) {
                        let batch = msg.payload.map(item => addTypeInfo(item));
                        client.publish(TOPIC_PREFIX_BATCH + gateway, JSON.stringify(batch));
                    } else {
                        let payload = addTypeInfo(msg.payload);
                        client.publish(TOPIC_PREFIX + gateway, JSON.stringify(payload));
                    }
                } else {
                    node.error(`Not supported payload=${msg.payload}`);
                }
            }
        });

        node.on('close', function() {
            closed = true;
            if (client) {
                client.end();
                client = null;
            }
        });
    }

    RED.nodes.registerType('arrow-connect-mqtt', AcnMqttNode, {
        credentials: {
            apikey: {type: 'text'}
        }
    });

}
