
#include <string>
#include <math.h>
#include <emscripten/bind.h>

using namespace emscripten;

struct MyStruct {
    float floatVal;
    std::string stringVal;
};

float do_sqrt(float x) {
    return sqrt(x);
}

MyStruct GetStruct() {
    MyStruct myStruct;
    myStruct.floatVal = 3.14f;
    myStruct.stringVal = "Hello from MyStruct!";
    return myStruct;
}

EMSCRIPTEN_BINDINGS(hello_world) {
    value_object<MyStruct>("MyStruct")
        .field("floatVal", &MyStruct::floatVal)
        .field("stringVal", &MyStruct::stringVal);

    function("do_sqrt", &do_sqrt);
    function("GetStruct", &GetStruct);
}
