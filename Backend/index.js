const express  = require("express");
const cors = require("cors");
require('dotenv').config();
const {GoogleGenAI, Type} = require("@google/genai");
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;


const app = express();
const PORT = process.env.PORT || 8080; 



app.use(cors({ 
              origin: 'https://ai-product-chatbot.netlify.app',  
              methods: ['GET', 'POST', 'PUT', 'DELETE'],
              credentials: true, 
        }));



 

const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API,});





app.get('/ai-details', async (req, res) => {

  const userInput = req.query.data



  try {


  const WooCommerce = new WooCommerceRestApi({
                   url: "https://azadproducts.in/",
                   consumerKey: process.env.Key,
                   consumerSecret: process.env.Secret,
                   version: "wc/v3"
                });

    
    WooCommerce.get("products")
               .then((response) => {
                 const apiData = response.data?.map((item) => {
                  return {
                    title: item.name.split(",")[0],
                    price: item.price, 
                    category: item.categories.map((item) => item.name)[0] ,
                    description: item.short_description.match(/<li>(.*?)<\/li>/)?.[1],
                    stock: item.stock_status,
                  }
                 });

                 toolCalling(apiData);

               })
               .catch((error) => {
                 // console.log(error.response?.data);
                 return res.status(500).json({ message: "WooCommerce API error" });
               });



    async function toolCalling(jsonData) {


      const getCategoryFunctionDec = {
        name:'getCategoryOfProduct',
        description: "Use this tool to Get the list of all category",
        parameters: {
                      type: "object",
                      properties: {},
                    },
       }

    
     const getProductsByCategory = {
        name:'getProductsFromCategory',
        description: "Get all products by category name",
        parameters:  { 
               type: Type.OBJECT,
               properties: {
                 category: {
                   type: Type.STRING,
                   },
               },
                required: ["category"]
        }
       }


    const getInfoByProducts = {
        name:'getInfoFromProducts',
        description: "Get detailed information about a specific product including image and price",
        parameters:  { 
               type: Type.OBJECT,
               properties: {
                 product: {
                   type: Type.STRING,
                   },
               },
                required: ["product"]
        }
    }





    function getCategoryOfProduct(prodcuts) {
            const catTitle = prodcuts?.map((item)=> item.category);
            return catTitle;
    }


    function getProductsFromCategory({category}){

      const allProductByCat = jsonData.filter(item => item.category?.toLowerCase() === category.toLowerCase() )

      return allProductByCat.length>0 ? allProductByCat : {message: 'No Product Found'}
    }


    function getInfoFromProducts({product}) {

      const productInfo = jsonData.filter(item => item.title?.toLowerCase() === product.toLowerCase())

      return productInfo? productInfo : {message: 'No Product Found'}
    }


   
    const content = [
                      {
                       role: 'user',
                       parts: [{ text: `can you please get ${userInput} using tool` }]
                      }
                    ]


    
    const response = await ai.models.generateContent({
                       model: 'gemini-2.5-flash',
                       contents: content,
                       config: {
                              tools:[
                                       {
                                          functionDeclarations: [getCategoryFunctionDec, getProductsByCategory, getInfoByProducts ],
                                       },
                                    ],
                              }
     });


    


    

     if(response.functionCalls){

      const tool_call = response.functionCalls[0];

     let result
     if (tool_call.name === 'getCategoryOfProduct') {
          result = getCategoryOfProduct(jsonData);
      }

     if (tool_call.name === 'getProductsFromCategory') {
          result = getProductsFromCategory(tool_call.args);
        }


     if (tool_call.name === 'getInfoFromProducts') {
          result = getInfoFromProducts(tool_call.args);
        }



    const function_response_part = {
                                  name: tool_call.name,
                                  response: { result }
                                  }

    content.push(response.candidates[0].content);
    content.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });





    const final_response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: content,
                            config: {
                              tools:[
                                       {
                                          functionDeclarations: [getCategoryFunctionDec, getProductsByCategory, getInfoByProducts],
                                       },
                                    ],
                              },
                          });


    

    res.json(final_response.text);

    } else {

       const showProductAssist = {
        name:'showUserProductAssist',
        description: "Use this tool to give answer you are a product assistant",
        parameters: {
                      type: "object",
                      properties: {},
                    },
       }


       function showUserProductAssist(){
          return "You are product assistant to help you in shopping."
        }


        const normalResponse = await ai.models.generateContent({
                              model: 'gemini-2.5-flash',
                              contents: userInput,
                              config: {
                                  tools: [
                                    {
                                      functionDeclarations: [showProductAssist],
                                    }
                                  ]
                              }
         })



       if(normalResponse.functionCalls){


       const Normal_tool_call = normalResponse.functionCalls[0];


        let normalResult
        if (Normal_tool_call.name === 'showUserProductAssist') {
              normalResult = showUserProductAssist();
        }


        const function_response_part = {
                                  name: Normal_tool_call.name,
                                  response: { normalResult },
                                  }

        content.push(normalResponse.candidates[0].content);
        content.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });





    const final_response = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: content,
                            config: {
                              tools:[
                                       {
                                          functionDeclarations: [showProductAssist],
                                       },
                                    ],
                              },
                          });

    

      res.status(200).json(final_response.text)


    } else {

      const otherResult = normalResponse.candidates[0].content.parts[0]

      res.status(200).json(otherResult.text);

    }

    }









  }
  } catch (err) {
    // console.error("Server Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }

    

})







app.listen(PORT, ()=> console.log("Server Started..."))
