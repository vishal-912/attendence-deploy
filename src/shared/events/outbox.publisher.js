'use strict';

async function publishEvent(eventType, payload) {
    console.log(`[Mock Outbox] ${eventType}`, payload);

    return {
        eventType,
        payload,
        published: false,
        createdAt: new Date(),
    };
}

module.exports = {
    publishEvent,
};