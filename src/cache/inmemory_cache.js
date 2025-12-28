const cache = new Map();

function get(key) {
    return cache.get(key);
}

function put(key, value) {
    cache.set(key, value);
}

function del(key) {
    cache.delete(key);
}

function flush() {
    cache.clear();
}

export default { get, put, del, flush };
