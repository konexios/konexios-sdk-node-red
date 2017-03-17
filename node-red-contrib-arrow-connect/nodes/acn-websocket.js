const ws = require('ws');

module.exports = function(RED) {

    const RECONNECT_TIMEOUT = 3000;

    function AcnWebsocketNode(config) {
        let node = this;
        RED.nodes.createNode(node, config);

        let closed = false;
        let timer;
        let apikey = node.credentials && node.credentials.apikey;
        let {url, device, telemetry} = config;
        if (!url || !apikey || !device || !telemetry) {
            node.error(`configuration error: url=${url}, apikey=${apikey}, device=${device}, telemetry=${telemetry}`);
            node.status({fill:'red',shape:'ring',text:'configuration error'});
            return;
        }
        if (!url.endsWith('/')) {
            url += '/';
        }
        url += `api/v1/kronos/devices/${device}/telemetry/${telemetry}`;

        let socket;
        function connect() {
            node.log(`connecting to ${url}`);
            node.status({fill:'grey',shape:'ring',text:'connecting'});
            timer = null;
            socket = new ws(url, {
                headers: {
                    'x-arrow-apikey': apikey
                }
            });
            socket.on('open',function() {
                node.log(`connected to ${url}`);
                node.status({fill:'green',shape:'dot',text:'connected'});
            });
            socket.on('close',function() {
                if (!closed && !timer) {
                    node.error(`disconnected from ${url}`);
                    node.status({fill:'red',shape:'ring',text:'disconnected'});
                    timer = setTimeout(connect, RECONNECT_TIMEOUT);
                }
            });
            socket.on('message',function(data,flags) {
                node.send({payload: JSON.parse(data)});
            });
            socket.on('error', function(err) {
                if (!closed && !timer) {
                    node.error(`error connecting to ${url}`);
                    node.status({fill:'red',shape:'ring',text:'error'});
                    timer = setTimeout(connect, RECONNECT_TIMEOUT);
                }
            });
        }
        connect();

        node.on('close', function() {
            closed = true;
            if (timer) {
                clearTimeout(timer);
            }
            if (socket) {
                socket.close();
                socket = null;
            }
        });
    }

    RED.nodes.registerType('arrow-connect-websocket', AcnWebsocketNode, {
        credentials: {
            apikey: {type: 'text'}
        }
    });
}
