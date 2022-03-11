// emcc window.c -O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s USE_GLFW=3 -o window.js
// emcc window.c -s USE_GLFW=3 -o window.html
#include <stdio.h>
// GLEW
#include <GL/glew.h>
// GLFW
#include <GLFW/glfw3.h>
#include <emscripten.h>

void onDraw(void *arg)
{
    GLFWwindow *window = *((GLFWwindow **)arg);
    glfwPollEvents();
    glClearColor(1.0f, 0.3f, 0.3f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    glfwSwapBuffers(window);
}

int main()
{
    // 初始化、配置 GLFW
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_RESIZABLE, GL_FALSE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);

    // 创建窗口对象
    GLFWwindow *window = glfwCreateWindow(800, 600, "LearnOpenGL", NULL, NULL);
    if (window == NULL)
    {
        // printf("Failed to create GLFW window");
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);

    // 初始化 GLEW
    glewExperimental = GL_TRUE;
    if (glewInit() != GLEW_OK)
    {
        // printf("Failed to initialize GLEW");
        return -1;
    }

    // Viewport
    int width, height;
    glfwGetFramebufferSize(window, &width, &height);
    glViewport(0, 0, width, height);

    // 主循环
    // while (!glfwWindowShouldClose(window))
    //{
    emscripten_set_main_loop_arg(onDraw, &window, 0, 1);
    //}

    // 释放资源
    // glfwTerminate();
    return 0;
}