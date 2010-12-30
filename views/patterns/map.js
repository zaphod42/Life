function(doc) {
    if (doc.pattern) {
        var tags = doc.tags || [],
            keys = {};
        keys[''] = 1;
        if (doc.name) {
            keys[doc.name] = 1;
        }
        if (doc.founder) {
            keys[doc.founder] = 1;
        }
        for (var i = 0; i < tags.length; ++i) {
            keys[tags[i]] = 1;
        }

        for (var key in keys) {
            emit(key, 1);
        }
    }
}
