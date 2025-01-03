(function() {


BARS.defineActions(function() {
    new Action('import_resource_pack', {
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKWSURBVFiFxZdNSFRRGIaf79yZKU0sDAoM2pRa0Caw6IdCodKWWrMIJdRJC2oVtcqIqBZt2lk4UaskaNJFkjQFEREVFEQUlRohglCR/Wjo6Mycr0Vj/k+be6/v8tyP+zzc8/OdCwsc8eKlxfHWdSpyRZRYT0XT5Wy1xgsBkCpRyoCWonj0RmFna66vAgrOPxWoyQvJ07VdrWvmqpWS+61hVXa5aiCyEWXTjNHvoramu/LIvWmlxfFoAljkqsD8sQpnevc0XkBEJwTUJ/hkhLvjwWBtX3n9TymOR9VByDEOv23KRwvtNk5yuwEoDOWwJa/ARziAlFgNrjcARiDfCbJ5SQHLnKAf9LTCyZ7dh58EAL4kx/gwOgwCSbUes2VQ4UBvReMDgICibxM2veFdYshjMIC8TBm779Puw/0TIwFNj5VKKG+Vq5xU6ijC8alDCteTocDRvvL6xDQlV8GZFMWjzQLnJnREae6ubLo4V23ACwFBvoICDFhrwx/3Hnk2X60nAj2/ll4ryv8x4ASSz3sqjg1mq/3vFGjVweWY4DbMUJfEYmn3NP8mazfUcMNWTOg1yB3s0ojb8KwCuu9QE9Y8Av7uEJUVXgjMmgKtq1vMcLAFtGHGk0ugLa7SR5YMTBPQcNNqrG0HSl0FzZ83/wS0OrITI7dQVvoEBzJrQPdHTiDy0G84gOj+QztQHvsJ/ZG25BrDIgFD0LwHuv0AKzCuyqhVUpmua+Rm9BtJuwm03WuBhFU+p9KkVHEyG3ByEYJQ3XgK0bN49r8w22n2OVAVqcRIGzDzjvYCeOUuX+7P2Qsy58FtmHK3VzktHVfPuyswz6eWWLSfcVOG0jY5al1vRJClHUtndASo1erGp4iGcbTDC4EFzx8WL+ORGqCS8gAAAABJRU5ErkJggg==',
        category: 'file',
        click: function () {
            console.log('import_resource_pack')
            // todo
        }
    })
})

})()