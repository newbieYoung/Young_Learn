#include <emscripten/bind.h>
#include <string>
#include <stdlib.h>
using namespace emscripten;

class AClass
{
public:
    AClass(int x, std::string y)
        : x(x), y(y)
    {
    }

    void incrementX()
    {
        ++x;
    }

    int getX() const { return x; }
    void setX(int x_) { x = x_; }

    static std::string getStringFromInstance(const AClass &instance)
    {
        return instance.y;
    }

private:
    int x;
    std::string y;
};

// Binding code
EMSCRIPTEN_BINDINGS(my_class_example)
{
    class_<AClass>("AClass")
        .constructor<int, std::string>()
        .function("incrementX", &AClass::incrementX)
        .property("x", &AClass::getX, &AClass::setX)
        .property("x_readonly", &AClass::getX)
        .class_function("getStringFromInstance", &AClass::getStringFromInstance);
}