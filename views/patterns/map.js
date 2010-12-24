function(doc) {
    if (doc.pattern) {
        emit(doc._id, doc);
    }
}
