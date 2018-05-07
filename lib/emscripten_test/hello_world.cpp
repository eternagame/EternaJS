
#include <string>
#include <math.h>
#include <vector>
#include <iostream>
#include <sstream>
#include <emscripten.h>
#include <emscripten/bind.h>

using namespace emscripten;

struct MyStruct {
    float floatVal;
    std::string stringVal;
    std::vector<float> floatVec;
};

struct MyClass {
    float floatVal;
    std::string stringVal;
    std::vector<float> floatVec;
};

void TraceJS (const char* text) {
    // EM_ASM_({
    //     Module.print("(Emscripten) " + $0);
    // }, text);

    // EM_ASM_ is more performant, but passing strings around is a pain

    std::string output = "Module.print('(Emscripten) " + std::string(text) + "');";
    emscripten_run_script(output.c_str());
}

int GetStringLength (const std::string& str) {
    return str.size();
}

MyStruct GetStruct() {
    return MyStruct { 3.14f, "Hello from MyStruct!", { 0.33f, 0.66f } };
}

MyClass* GetStructPtr () {
    return new MyClass { 666, "Hello from MyClass!", { 0.1f, 0.2f, 0.3f } };
}

void SendLog () {
    char* text = "Hello from C++ ... !";
    text[5] = 0;
    std::string tt = text;
    TraceJS(tt.c_str());

    // TraceJS("Hello from C++!");
}

int main() {
    std::cout << GetStruct().stringVal;
    TraceJS("main() run");
    return 0;
}

EMSCRIPTEN_BINDINGS(hello_world) {
    register_vector<float>("VectorFloat");

    value_object<MyStruct>("MyStruct")
        .field("floatVal", &MyStruct::floatVal)
        .field("stringVal", &MyStruct::stringVal)
        .field("floatVec", &MyStruct::floatVec);

    class_<MyClass>("MyClass")
        .constructor()
        .property("floatVal", &MyClass::floatVal)
        .property("stringVal", &MyClass::stringVal)
        .property("floatVec", &MyClass::floatVec);

    function("SendLog", &SendLog);
    function("GetStruct", &GetStruct);
    function("GetStringLength", &GetStringLength);

    // GetStructPtr returns a raw pointer, so we need to use allow_raw_pointers()
    function("GetStructPtr", &GetStructPtr, allow_raw_pointers());
}
