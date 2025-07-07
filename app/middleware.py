import logging
import uuid
import threading

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            body = request.body.decode('utf-8')
            if body:
                logger.info(f"Request Path: {request.path}, Method: {request.method}, Body: {body}")
            else:
                logger.info(f"Request Path: {request.path}, Method: {request.method}, Body: <empty>")
        except Exception as e:
            logger.error(f"Error decoding request body: {e}")

        response = self.get_response(request)

        return response

_thread_locals = threading.local()

def get_current_trace_id():
    return getattr(_thread_locals, 'trace_id', None)

class TraceIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        trace_id = request.headers.get('X-Trace-ID', str(uuid.uuid4()))
        _thread_locals.trace_id = trace_id
        response = self.get_response(request)
        response['X-Trace-ID'] = trace_id
        return response
