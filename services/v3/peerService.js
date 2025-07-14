let peers = [];

export const Peer = {
    async add(name, ipAddress, port = 1984) {
        peers.push({ name, ipAddress, port });
    },

    async remove(ipAddress, port = 1984) {
        peers = peers.filter((peer) => {
            return !(peer.ipAddress === ipAddress && peer.port === port);
        });
    },
};
